import enablementContentService from '../services/EnablementContentService.js';

function normaliseFilterParam(value) {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => String(entry).split(',')).map((entry) => entry.trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default class EnablementController {
  static async listArticles(req, res, next) {
    try {
      const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit ?? '25', 10)));
      const offset = Math.max(0, Number.parseInt(req.query.offset ?? '0', 10));
      const filters = {
        audience: normaliseFilterParam(req.query.audience),
        product: normaliseFilterParam(req.query.product),
        tag: normaliseFilterParam(req.query.tag),
        q: req.query.q
      };

      const result = await enablementContentService.listArticles(filters, { limit, offset });

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getArticle(req, res, next) {
    try {
      const { slug } = req.params;
      const format = req.query.format === 'html' ? 'html' : 'markdown';
      const article = await enablementContentService.getArticle(slug, { format });
      if (!article) {
        return res.status(404).json({
          success: false,
          message: `Enablement article ${slug} not found`
        });
      }

      return res.json({ success: true, data: article });
    } catch (error) {
      return next(error);
    }
  }

  static async getCapabilityMatrix(_req, res, next) {
    try {
      const matrix = await enablementContentService.getCapabilityMatrix();
      return res.json({ success: true, data: matrix });
    } catch (error) {
      return next(error);
    }
  }

  static async refreshIndex(_req, res, next) {
    try {
      const summary = await enablementContentService.refreshCache();
      return res.status(202).json({ success: true, data: summary });
    } catch (error) {
      return next(error);
    }
  }
}
