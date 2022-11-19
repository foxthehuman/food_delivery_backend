const router = require("express").Router();
const comment = require("../controller/comment_controller");
const middleware = require("../middleware");

router.route("/comment/create").post(middleware, comment.createComment);
router.post("/comment/edit", comment.editComment);

module.exports = router;
