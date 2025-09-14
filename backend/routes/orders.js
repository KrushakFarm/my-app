const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Your existing auth middleware
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// GET /api/orders - Get user's orders  
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const orders = await Order.find({ userId: userId })
      .populate('items.productId', 'name price image')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// POST /api/orders - Place new order
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentMethod } = req.body;

    if (!paymentMethod || !['cod', 'upi'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method'
      });
    }

    // Get cart items
    const cartItems = await Cart.find({ userId: userId })
      .populate('productId', 'name price image farmerId');

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Calculate total and prepare order
    let totalAmount = 0;
    const orderItems = [];

    for (let cartItem of cartItems) {
      const product = cartItem.productId;
      
      if (!product || product.quantity < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product?.name || 'product'}`
        });
      }

      const itemTotal = product.price * cartItem.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        price: product.price,
        quantity: cartItem.quantity,
        farmerId: product.farmerId
      });
    }

    // Create order
    const order = new Order({
      userId: userId,
      items: orderItems,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod,
      status: 'pending'
    });

    await order.save();

    // Update stock and clear cart
    for (let cartItem of cartItems) {
      await Product.findByIdAndUpdate(
        cartItem.productId._id,
        { $inc: { quantity: -cartItem.quantity } }
      );
    }

    await Cart.deleteMany({ userId: userId });

    res.json({
      success: true,
      message: 'Order placed successfully',
      orderId: order._id,
      totalAmount: totalAmount
    });

  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order: ' + error.message
    });
  }
});

module.exports = router;