const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// GET /api/cart
router.get('/', auth, async (req, res) => {
  try {
    const cartItems = await Cart.find({ userId: req.user.id })
      .populate('productId', 'name price image unit');

    const formattedCart = cartItems.map(item => ({
      productId: item.productId._id,
      name: item.productId.name,
      price: item.productId.price,
      image: item.productId.image,
      unit: item.productId.unit,
      quantity: item.quantity
    }));

    res.json(formattedCart);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
});

// POST /api/cart/add
router.post('/add', auth, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const existingCartItem = await Cart.findOne({ userId: req.user.id, productId });

    if (existingCartItem) {
      existingCartItem.quantity += 1;
      await existingCartItem.save();
    } else {
      const cartItem = new Cart({ userId: req.user.id, productId, quantity: 1 });
      await cartItem.save();
    }

    res.json({ success: true, message: 'Added to cart' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add to cart' });
  }
});

// DELETE /api/cart/:productId
router.delete('/:productId', auth, async (req, res) => {
  try {
    await Cart.deleteMany({ userId: req.user.id, productId: req.params.productId });
    res.json({ success: true, message: 'Removed from cart' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove from cart' });
  }
});

module.exports = router;