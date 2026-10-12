import { prisma } from '../../lib/prisma.js';

export const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const fieldsParam = req.query.fields;

    // Validate page & limit
    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive integers.' });
    }

    // Enforce MAX_LIMIT guard
    const MAX_LIMIT = 100;
    if (limit > MAX_LIMIT) {
      limit = MAX_LIMIT;
    }

    // Whitelist for allowed sorting columns
    const ALLOWED_SORT_FIELDS = ['id', 'name', 'price', 'stock', 'createdAt', 'updatedAt'];
    if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
      return res.status(400).json({
        error: `Invalid sortBy field. Allowed fields: ${ALLOWED_SORT_FIELDS.join(', ')}`,
      });
    }

    // Whitelist for dynamic field selection (?fields=)
    const ALLOWED_SELECT_FIELDS = ['id', 'name', 'price', 'stock', 'createdAt', 'updatedAt'];
    let selectClause = undefined;

    if (fieldsParam) {
      const requestedFields = fieldsParam.split(',').map((f) => f.trim()).filter(Boolean);

      // Validate requested fields against whitelist
      const invalidFields = requestedFields.filter((f) => !ALLOWED_SELECT_FIELDS.includes(f));
      if (invalidFields.length > 0) {
        return res.status(400).json({
          error: `Invalid field selection: ${invalidFields.join(', ')}. Allowed fields are: ${ALLOWED_SELECT_FIELDS.join(', ')}`,
        });
      }

      // Build select object for Prisma
      selectClause = {};
      requestedFields.forEach((field) => {
        selectClause[field] = true;
      });
    }

    const skip = (page - 1) * limit;

    // Fetch data and count concurrently
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        select: selectClause,
      }),
      prisma.product.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};