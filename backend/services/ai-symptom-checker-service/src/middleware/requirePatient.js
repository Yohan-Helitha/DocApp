export default (req, res, next) => {
  if (!req.user || req.user.role !== "patient") {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
};
