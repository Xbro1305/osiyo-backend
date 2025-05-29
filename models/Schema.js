const { Schema, model } = require("mongoose");

const UserSchema = new Schema({
  firstname: {
    type: String,
    required: true,
    min: 2,
    max: 25,
  },
  lastname: {
    type: String,
    required: true,
    min: 2,
    max: 25,
  },
  username: {
    type: String,
    required: true,
    min: 6,
    max: 16,
  },
  password: {
    type: String,
    required: true,
    min: 6,
    max: 16,
  },
  email: {
    type: String,
    min: 6,
    max: 26,
  },
  phone: {
    type: String,
    min: 10,
    max: 16,
  },
  role: {
    type: String,
    min: 3,
    max: 6,
  },
});

const Users = model("Users", UserSchema);
module.exports = { Users };
