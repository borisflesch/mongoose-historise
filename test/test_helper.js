const mongoose = require("mongoose");

const url = `mongodb://localhost:27017/mongoose-historise-test`;
mongoose.Promise = global.Promise;
mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("useUnifiedTopology", true);

mongoose.connect(url);