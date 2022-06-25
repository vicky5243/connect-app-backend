const hasLiked = (likes, target) => {
  // There are already some likes exists (more than 1 likes)
  if (likes.length) {
    const hasLiked = likes.find(like => like.dataValues.userId === target);
    // Online user has already liked this post
    if (hasLiked) {
      return true
    }
    // Online user has not liked this post yet
    else {
      return false
    }
  }
  // There are no likes yet (0 likes)
  else {
    return false
  }
};

module.exports = hasLiked