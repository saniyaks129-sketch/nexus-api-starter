import { prisma } from '../../lib/prisma.js';

export const getOrders = async (req, res) => {
  try {
    // Fetches all orders with related user and items in a single query
    const orders = await prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    return res.status(200).json({ data: orders });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};