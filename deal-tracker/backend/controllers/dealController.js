const Deal = require("../models/dealModel");

// Helper to determine the correct URL/path to save in the database
const getFilePath = (fileArray) => {
  if (!fileArray || !fileArray[0]) return "";
  // If local diskStorage is used, it sets 'filename'. Map it to our static route.
  if (fileArray[0].filename) {
    return `/uploads/${fileArray[0].filename}`;
  }
  // If Cloudinary or other cloud storage is used, 'path' usually contains the full URL.
  return fileArray[0].path;
};

// CREATE DEAL
exports.createDeal = async (req, res) => {
  try {
    let data;
    if (req.body.data) {
      data = JSON.parse(req.body.data);
    } else {
      data = req.body;
    }

    if (!data.cname) {
      return res.status(400).json({ message: "Customer name required" });
    }

    if (!data.files) data.files = {};
    if (req.files) {
      if (req.files['pill-auto']) data.files.autoUpload = getFilePath(req.files['pill-auto']);
      if (req.files['pill-video']) data.files.videoUpload = getFilePath(req.files['pill-video']);
      if (req.files['pill-quot']) data.files.quotation = getFilePath(req.files['pill-quot']);
      if (req.files['pill-price']) data.files.pricelist = getFilePath(req.files['pill-price']);
      if (req.files['pill-ledger']) data.files.ledger = getFilePath(req.files['pill-ledger']);
      if (req.files['pill-slip']) data.files.paymentSlip = getFilePath(req.files['pill-slip']);
      if (req.files['pill-other']) data.files.other = getFilePath(req.files['pill-other']);
      if (req.files['pill-paycard']) data.files.paymentCard = getFilePath(req.files['pill-paycard']);
    }

    const deal = new Deal(data);
    await deal.save();

    res.status(201).json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET ALL DEALS
exports.getDeals = async (req, res) => {
  try {
    const search = req.query.search || "";

    const deals = await Deal.find({
      $or: [
        { cname: { $regex: search, $options: "i" } },
        { dname: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { scname: { $regex: search, $options: "i" } },
      ],
    }).sort({ createdAt: -1 });

    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET SINGLE DEAL
exports.getDealById = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE DEAL
exports.updateDeal = async (req, res) => {
  try {
    let data;
    if (req.body.data) {
      data = JSON.parse(req.body.data);
    } else {
      data = req.body;
    }

    const updatePayload = { ...data };

    // Handle file uploads by creating flat dot-notation keys
    // This avoids Mongoose "conflict" errors when updating nested objects
    if (req.files) {
      if (req.files['pill-auto']) updatePayload['files.autoUpload'] = getFilePath(req.files['pill-auto']);
      if (req.files['pill-video']) updatePayload['files.videoUpload'] = getFilePath(req.files['pill-video']);
      if (req.files['pill-quot']) updatePayload['files.quotation'] = getFilePath(req.files['pill-quot']);
      if (req.files['pill-price']) updatePayload['files.pricelist'] = getFilePath(req.files['pill-price']);
      if (req.files['pill-ledger']) updatePayload['files.ledger'] = getFilePath(req.files['pill-ledger']);
      if (req.files['pill-slip']) updatePayload['files.paymentSlip'] = getFilePath(req.files['pill-slip']);
      if (req.files['pill-other']) updatePayload['files.other'] = getFilePath(req.files['pill-other']);
      if (req.files['pill-paycard']) updatePayload['files.paymentCard'] = getFilePath(req.files['pill-paycard']);
    }
    
    // Prevent overriding the entire `files` object if it's sent from the client
    if (updatePayload.files) {
      delete updatePayload.files; 
    }

    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE DEAL
exports.deleteDeal = async (req, res) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SUMMARY
exports.getSummary = async (req, res) => {
  try {
    const deals = await Deal.find();

    const totalDeals = deals.length;
    const totalVariance = deals.reduce((sum, d) => sum + (d.totalVr || 0), 0);
    const totalBusiness = deals.reduce((sum, d) => sum + (d.totalAc || 0), 0);

    res.json({
      totalDeals,
      totalVariance,
      avgVariance: totalDeals ? totalVariance / totalDeals : 0,
      totalBusiness,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const os = require("os");
const { getStats } = require("../utils/monitorStore");

// HEALTH / CAPACITY STATS
exports.getHealthStats = async (req, res) => {
  try {
    const count = await Deal.countDocuments();
    const dbStats = count > 0 ? await Deal.collection.stats() : { size: 0, storageSize: 0, avgObjSize: 0 };
    const monitorStats = getStats();
    
    // CPU & Memory
    const cpus = os.cpus();
    const freeMem = os.freemem() / 1024 / 1024;
    const totalMem = os.totalmem() / 1024 / 1024;
    const memUsagePercent = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);
    
    // Dynamic Capacity Calculation
    // Based on available RAM and a heuristic that each concurrent user needs ~2MB of RAM
    // and standard Node instance throughput
    const estimatedMaxUsers = Math.floor((freeMem / 2) + 50); 
    
    const LIMIT_MB = 512;
    const sizeMB = dbStats.storageSize / 1024 / 1024;
    const storageUsagePercent = ((sizeMB / LIMIT_MB) * 100).toFixed(2);

    // Error Rate
    const errorRate = monitorStats.totalRequests > 0 
      ? ((monitorStats.totalErrors / monitorStats.totalRequests) * 100).toFixed(1) 
      : 0;

    res.json({
      totalRecords: count,
      dataSizeMB: (dbStats.size / 1024 / 1024).toFixed(3),
      storageUsagePercent,
      memoryUsageMB: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
      systemMemUsagePercent: memUsagePercent,
      cpuCores: cpus.length,
      estimatedMaxUsers,
      uptimeHours: (process.uptime() / 3600).toFixed(2),
      errorRate: errorRate + "%",
      slowQueries: monitorStats.slowQueries,
      status: storageUsagePercent > 90 || errorRate > 5 ? "CRITICAL" : (storageUsagePercent > 70 ? "WARNING" : "HEALTHY"),
      suggestions: [
        storageUsagePercent > 85 ? "Storage critical: Upgrade DB plan" : null,
        errorRate > 5 ? "High error rate detected: Check error.log" : null,
        count > 5000 ? "Pagination recommended for All Records" : null
      ].filter(Boolean)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};