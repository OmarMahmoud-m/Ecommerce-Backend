import express from 'express';
import { FavouriteItem } from '../models/FavouriteItem.js';
import { Product } from '../models/Product.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const favourites = await FavouriteItem.findAll({ where: { userId: req.user.id } });
    const items = await Promise.all(favourites.map(async (favourite) => ({ ...favourite.toJSON(), product: await Product.findByPk(favourite.productId) })));
    res.json(items);
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!await Product.findByPk(productId)) return res.status(400).json({ error: 'Product not found' });
    const [favourite, created] = await FavouriteItem.findOrCreate({ where: { userId: req.user.id, productId } });
    res.status(created ? 201 : 200).json(favourite);
  } catch (error) { next(error); }
});

router.delete('/:productId', async (req, res, next) => {
  try {
    const deleted = await FavouriteItem.destroy({ where: { userId: req.user.id, productId: req.params.productId } });
    if (!deleted) return res.status(404).json({ error: 'Favourite item not found' });
    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;
