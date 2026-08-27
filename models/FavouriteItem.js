import { DataTypes } from 'sequelize';
import { sequelize } from './index.js';

export const FavouriteItem = sequelize.define('FavouriteItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' }
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Products', key: 'id' }
  }
}, {
  indexes: [{ unique: true, fields: ['userId', 'productId'] }],
  defaultScope: { order: [['createdAt', 'DESC']] }
});
