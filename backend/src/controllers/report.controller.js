const reportService = require('../services/report.service');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const getDashboard = async (req, res) => {
  try {
    const summary = await reportService.getDashboardSummary();
    return successResponse(res, summary, 'Data dashboard berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const getStockReport = async (req, res) => {
  try {
    const { categoryId, lowStockOnly } = req.query;

    const report = await reportService.getStockReport({
      categoryId,
      lowStockOnly: lowStockOnly === 'true',
    });

    return successResponse(res, report, 'Laporan stok berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const getFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    const report = await reportService.getFinancialReport({
      startDate,
      endDate,
      type,
    });

    return successResponse(res, report, 'Laporan keuangan berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const getTrendReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;

    const report = await reportService.getTrendReport({
      startDate,
      endDate,
      groupBy,
    });

    return successResponse(res, report, 'Laporan tren berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

module.exports = { getDashboard, getStockReport, getFinancialReport, getTrendReport };
