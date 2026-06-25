import { NextResponse } from 'next/server';
import { toApiError } from '@/lib/apiError';
import prisma from '@/lib/prisma';
import {
  getById, updateSaleProperty, updateSaleStatus, removeSaleProperty,
  updateDrawingImage, updateDrawingImageByUrl, updateVideoUrl,
} from '../../../../../lib/services/admin/sale.service.js';

const SOLD_STATUSES = new Set(['SOLD', 'REGISTERED', 'UNREGISTERED']);

async function triggerAreaSalesSpeed(propertyId, lat, lng) {
  if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) return;
  try {
    const now = new Date();
    const startOfRange = new Date(now.getFullYear() - 1, 0, 1);
    const months =
      (now.getFullYear() - startOfRange.getFullYear()) * 12 +
      (now.getMonth() - startOfRange.getMonth()) + 1;

    const rows = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::INT AS total_sold
      FROM properties p
      INNER JOIN sale_properties sp ON sp.property_id = p.property_id
      WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        AND p.property_type = 'sale'
        AND p.created_at >= $3
        AND sp.sale_status IN ('SOLD', 'REGISTERED', 'UNREGISTERED')
        AND (
          6371 * acos(
            LEAST(1.0, cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2))
            + sin(radians($1)) * sin(radians(p.latitude)))
          )
        ) <= 1
    `, parseFloat(lat), parseFloat(lng), startOfRange);

    const totalSold = Number(rows[0]?.total_sold || 0);
    const speed = months > 0 ? parseFloat((totalSold / months).toFixed(2)) : 0;

    await prisma.$executeRawUnsafe(
      `UPDATE sale_properties SET area_sales_speed = $1 WHERE property_id = $2`,
      speed, propertyId
    );
    await prisma.$executeRawUnsafe(
      `UPDATE properties SET area_speed = $1 WHERE property_id = $2`,
      speed, propertyId
    );
  } catch {
    // non-fatal — speed calc failure should not block the main update
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await getById(id);
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('drawing_image');
      const result = await updateDrawingImage(id, file);
      return NextResponse.json(result);
    }

    const body = await request.json();

    if ('drawing_image_url' in body && Object.keys(body).length === 1) {
      const result = await updateDrawingImageByUrl(id, body.drawing_image_url);
      return NextResponse.json(result);
    }

    if ('video_url' in body && Object.keys(body).length === 1) {
      const result = await updateVideoUrl(id, body.video_url);
      return NextResponse.json(result);
    }

    if (body.status && Object.keys(body).length === 1) {
      const result = await updateSaleStatus(id, body.status);
      return NextResponse.json(result);
    }

    const prevRows = await prisma.$queryRawUnsafe(
      `SELECT sp.sale_status, p.latitude, p.longitude FROM sale_properties sp JOIN properties p ON p.property_id = sp.property_id WHERE sp.property_id = $1`,
      Number(id)
    );
    const prev = prevRows[0];

    const result = await updateSaleProperty(id, body);

    // Auto-trigger area sales speed when sale_status transitions to a SOLD-equivalent
    if (
      body.sale_status &&
      SOLD_STATUSES.has(body.sale_status) &&
      (!prev?.sale_status || !SOLD_STATUSES.has(prev.sale_status))
    ) {
      const lat = body.latitude ?? prev?.latitude;
      const lng = body.longitude ?? prev?.longitude;
      triggerAreaSalesSpeed(Number(id), lat, lng); // fire-and-forget
    }

    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const result = await removeSaleProperty(id);
    return NextResponse.json(result);
  } catch (e) {
    const { status, body } = toApiError(e);
    return NextResponse.json(body, { status });
  }
}
