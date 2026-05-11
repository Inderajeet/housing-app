import prisma from '../../prisma.js';

export const getNotes = async ({ buyer_id, seller_id, property_id, enquiry_id, booking_id }) => {
  const where = {};
  if (buyer_id) where.buyer_id = Number(buyer_id);
  if (seller_id) where.seller_id = Number(seller_id);
  if (property_id) where.property_id = Number(property_id);
  if (enquiry_id) where.enquiry_id = Number(enquiry_id);
  if (booking_id) where.booking_id = Number(booking_id);

  return prisma.contact_notes.findMany({
    where,
    orderBy: { note_date: 'desc' },
    include: {
      buyers: { select: { buyer_id: true, name: true, phone_number: true } },
      sellers: { select: { seller_id: true, name: true, phone_number: true } },
      properties: { select: { property_id: true, formatted_id: true } },
    },
  });
};

export const createNote = async ({ note_text, note_date, buyer_id, seller_id, property_id, enquiry_id, booking_id }) => {
  return prisma.contact_notes.create({
    data: {
      note_text,
      note_date: note_date ? new Date(note_date) : new Date(),
      buyer_id: buyer_id ? Number(buyer_id) : null,
      seller_id: seller_id ? Number(seller_id) : null,
      property_id: property_id ? Number(property_id) : null,
      enquiry_id: enquiry_id ? Number(enquiry_id) : null,
      booking_id: booking_id ? Number(booking_id) : null,
    },
  });
};

export const deleteNote = async (id) => {
  return prisma.contact_notes.delete({ where: { id: Number(id) } });
};
