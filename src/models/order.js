const { sequelize } = require("../services/common");
const { DataTypes, Op, QueryTypes } = require("sequelize");
const { query } = require("express");

const Order = sequelize.define(
  "order",
  {
    id: {
      type: DataTypes.STRING(25),
      primaryKey: true,
    },
    account_id: {
      type: DataTypes.STRING(10),
      allowNull: false,
      references: {
        model: "account",
        key: "id",
      },
    },
    address: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    ship_fee: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.STRING(25),
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(25),
      allowNull: false,
      references: {
        model: "status",
        key: "id",
      },
    },
    product_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    timestamps: false,
  }
);

async function insertOrder(order_id, account_id, address, ship_fee, payment_method, product_count, timestamp) {
  try {
    await Order.create({
      id: order_id,
      account_id: account_id,
      address: address,
      ship_fee: ship_fee,
      payment_method: payment_method,
      product_count: product_count,
      status: "NRY",
      timestamp: timestamp,
      progress: 0,
    });

    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function getOrderByAccount(account_id, order_id) {
  return await Order.findAll({
    where: {
      [Op.and]: [
        {
          account_id: {
            [Op.eq]: account_id,
          },
        },
        {
          id: {
            [Op.eq]: order_id,
          },
        },
      ],
    },
  });
}

async function getTotalOrdersByStatusOfUser(user_id, status_id) {
  const total = await sequelize.query(
    "select count(id) as 'total_count' from food_delivery.order where account_id = '" +
      user_id +
      "' and status = '" +
      status_id +
      "'",
    {
      type: QueryTypes.SELECT,
    }
  );
  return total[0].total_count;
}

async function increaseOrderProgress(order_id) {
  try {
    await sequelize.query("update food_delivery.order set progress = progress + 1 where id = '" + order_id + "'", {
      type: QueryTypes.UPDATE,
    });
    return true;
  } catch (error) {
    return error;
  }
}

async function getOrderProgress(order_id) {
  try {
    const progress = await sequelize.query("select progress from food_delivery.order where id = '" + order_id + "'", {
      type: QueryTypes.SELECT,
    });
    return progress[0].progress;
  } catch (error) {
    return error;
  }
}

async function getOrderProductCount(order_id) {
  try {
    const productcount = await sequelize.query(
      "select product_count from food_delivery.order where id = '" + order_id + "'",
      {
        type: QueryTypes.SELECT,
      }
    );
    return productcount[0].product_count;
  } catch (error) {
    return error;
  }
}

async function getTotalOrdersByStatus(store_id, status_id) {
  const total = await sequelize.query(
    "select count(o.id) as 'total_orders' from food_delivery.order o inner join order_detail od on o.id = od.order_id where store_id = '" +
      store_id +
      "' and status = '" +
      status_id +
      "'",
    {
      type: QueryTypes.SELECT,
    }
  );
  return total[0].total_orders;
}

async function getRangeOrdersByStatus(start, size, store_id, status_id) {
  const data = await sequelize.query(
    "SELECT o.id, (select email from account a where a.id = o.account_id) 'email', timestamp, payment_method, product_id, " +
      "(select name from menu m where m.id = product_id) 'product', " +
      "(select name from status s where s.id = o.status) 'status', progress, proceed " +
      "FROM food_delivery.order o inner join order_detail od on o.id = od.order_id " +
      "where store_id = '" +
      store_id +
      "' order by timestamp DESC limit " +
      size +
      " offset " +
      start,
    {
      type: QueryTypes.SELECT,
    }
  );
  return data;
}

async function getRangeOrdersByStatusOfUser(start, size, user_id, status_id) {
  return await Order.findAll({
    where: {
      [Op.and]: [
        {
          status: {
            [Op.eq]: status_id,
          },
        },
        {
          account_id: {
            [Op.eq]: user_id,
          },
        },
      ],
    },
    order: [["timestamp", "DESC"]],
    offset: start,
    limit: size,
  });
}

async function getOrderById(order_id) {
  return await Order.findAll({
    raw: true,
    attributes: ["id", "address", "ship_fee", "timestamp", "payment_method"],
    where: {
      id: {
        [Op.eq]: order_id,
      },
    },
  });
}

async function getUserOrderWithCommentList(account_id, order_id) {
  try {
    const data = await sequelize.query(
      "select store_id, (select name from store s where c.store_id = s.id) 'store_name',comment, star, timestamp, updated from food_delivery.comment c where order_id='" +
        order_id +
        "'" +
        "and account_id = '" +
        account_id +
        "'",
      {
        type: QueryTypes.SELECT,
      }
    );
    //console.log(data);
    return data;
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function updateStatus(id, status_id) {
  try {
    await Order.update(
      {
        status: status_id,
      },
      {
        where: {
          // id: {
          //   [Op.eq]: id,
          // },

          id: id,
        },
      }
    );
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function calculateTotalPerDayWithLimit(store_id, limit) {
  try {
    const data = await sequelize.query(
      "SELECT Round(UNIX_TIMESTAMP(FROM_UNIXTIME(ord.timestamp/1000, '%Y-%m-%d'))*1000) 'otimestamp'," +
        " SUM(price + ship_fee * quantity ) 'total' FROM food_delivery.order ord " +
        "inner join order_detail od on ord.id = od.order_id " +
        "where store_id = '" +
        store_id +
        "' group by otimestamp order by otimestamp desc limit " +
        limit,
      {
        type: QueryTypes.SELECT,
      }
    );
    return data;
  } catch (err) {
    console.log(err);
    return 0;
  }
}

async function getOrderReceivedStateByOrderId(order_id) {
  try {
    const data = await sequelize.query(
      "SELECT (select name from menu m where m.id = od.product_id) 'name', quantity, " +
        "(select name from store s where s.id = od.store_id) 'store', proceed FROM food_delivery.order_detail od where order_id = '" +
        order_id +
        "'",
      {
        type: QueryTypes.SELECT,
      }
    );
    return data;
  } catch (err) {
    console.log(err);
    return 0;
  }
}
// async function calculateTotalPerDayWithLimit(store_id, limit, skip) {
//   try {
//     const data = await sequelize.query(
//       "SELECT FROM_UNIXTIME(ord.timestamp/1000, '%Y-%m-%d') 'only_date', SUM(price + ship_fee * quantity ) 'total' FROM food_delivery.order ord " +
//         "inner join order_detail od on ord.id = od.order_id " +
//         "where store_id = '" +
//         store_id +
//         "' group by only_date order by only_date limit " +
//         limit +
//         " offset " +
//         skip,
//       {
//         type: QueryTypes.SELECT,
//       }
//     );
//     return data;
//   } catch (err) {
//     console.log(err);
//     return 0;
//   }
// }

module.exports = {
  Order,
  updateStatus,
  insertOrder,
  increaseOrderProgress,
  getOrderById,
  getOrderProgress,
  getOrderProductCount,
  getOrderReceivedStateByOrderId,
  getOrderByAccount,
  getUserOrderWithCommentList,
  getTotalOrdersByStatusOfUser,
  getTotalOrdersByStatus,
  getRangeOrdersByStatus,
  getRangeOrdersByStatusOfUser,
  //calculateTotalPerDayWithLimit,
};
