import prisma from '../../prisma.js';

export const getUnread = async () => {
  const enquiryRows = await prisma.$queryRawUnsafe(`
    SELECT e.enquiry_id, e.enquiry_date, e.enquiry_type,
      b.name AS buyer_name, b.phone_number AS buyer_phone,
      s.name AS seller_name, s.phone_number AS seller_phone,
      p.property_type, p.formatted_id
    FROM enquiries e
    LEFT JOIN buyers b ON b.buyer_id = e.buyer_id
    LEFT JOIN sellers s ON s.seller_id = e.seller_id
    JOIN properties p ON p.property_id = e.property_id
    WHERE e.is_read = false
    ORDER BY e.enquiry_date DESC
    LIMIT 30
  `);

  const bookingRows = await prisma.$queryRawUnsafe(`
    SELECT b.booking_id, b.locked_at, b.unit_type, b.status,
      buy.name AS buyer_name, buy.phone_number AS buyer_phone,
      p.formatted_id
    FROM bookings b
    LEFT JOIN buyers buy ON buy.buyer_id = b.buyer_id
    LEFT JOIN properties p ON p.property_id = b.property_id
    WHERE b.is_read = false
    ORDER BY b.booking_id DESC
    LIMIT 30
  `);

  const enquiries = enquiryRows.map((e) => {
    const listingType = e.property_type === 'rent' ? 'rent' : 'sale';
    return {
      kind: 'enquiry',
      id: e.enquiry_id,
      listingType,
      role: e.enquiry_type === 'seller' ? 'seller' : 'buyer',
      name: e.buyer_name || e.seller_name || 'Unknown',
      phone: e.buyer_phone || e.seller_phone || '',
      propertyId: e.formatted_id,
      date: e.enquiry_date,
      href: listingType === 'rent' ? '/admin/rent/enquiries' : '/admin/enquiries',
    };
  });

  const bookings = bookingRows.map((b) => {
    const listingType = b.unit_type === 'rent' ? 'rent' : 'sale';
    return {
      kind: 'booking',
      id: b.booking_id,
      listingType,
      role: 'buyer',
      name: b.buyer_name || 'Unknown',
      phone: b.buyer_phone || '',
      propertyId: b.formatted_id,
      status: b.status,
      date: b.locked_at,
      href: listingType === 'rent' ? '/admin/rent/bookings' : '/admin/sale/bookings',
    };
  });

  const items = [...enquiries, ...bookings]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 30);

  return { total: enquiries.length + bookings.length, items };
};
