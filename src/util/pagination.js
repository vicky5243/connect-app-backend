const getPagination = (page, size) => {
  const limit = size;
  const offset = --page * limit;
  return { limit, offset };
};

const getPagingData = (data, page, limit) => {
  const { count, rows } = data;
  const currentPage = page++;
  const totalPages = Math.ceil(count / limit);
  return { count, rows, currentPage, totalPages };
};

module.exports = {
  getPagination,
  getPagingData
}