const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category) query.category = category;

    const products = await Product.find(query)
      .populate('farmerId', 'name email')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// POST /api/products
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ success: false, message: 'Only farmers can add products' });
    }

    const { name, price, quantity, unit, category, image } = req.body;

    if (!name || !price || !quantity || !unit || !category || !image) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const product = new Product({
      name, price: parseFloat(price), quantity: parseInt(quantity),
      unit, category, image, farmerId: req.user.id
    });

    await product.save();
    res.status(201).json({ success: true, message: 'Product added', product });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add product' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

module.exports = router;