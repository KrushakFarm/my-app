const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0 },
  unit: { 
    type: String, 
    required: true, 
    enum: ['kg', 'grams', 'liters', 'ml', 'pieces', 'bunches'] 
  },
  category: { 
    type: String, 
    required: true, 
    enum: ['Vegetables', 'Fruits', 'Grains', 'Dairy'] 
  },
  image: { type: String, required: true },
  farmerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);