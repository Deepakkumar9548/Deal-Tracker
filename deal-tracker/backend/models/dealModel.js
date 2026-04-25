const mongoose = require("mongoose");

const dealSchema = new mongoose.Schema(
  {
    cname: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    cnum: {
      type: String,
      trim: true,
    },

    dname: { type: String, trim: true },
    dlocation: { type: String, trim: true },
    dealer: { type: String, trim: true },
    scname: { type: String, trim: true },

    model: { type: String, trim: true },

    nature: { type: String, trim: true },
    decision: { type: String, trim: true },
    mgmtDecision: { type: String, trim: true },
    obssource: { type: String, trim: true },

    dvisit: { type: String, trim: true },
    booking: { type: String, trim: true },
    dbooking: { type: String, trim: true },
    ddelivery: { type: String, trim: true },
    dbreach: { type: String, trim: true },
    dms: { type: String, trim: true },
    dclosed: { type: String, trim: true },

    approvedby: { type: String, trim: true },
    obs: { type: String, trim: true },

    sb: { type: [Number], default: [] },
    ac: { type: [Number], default: [] },
    sbLabels: { type: [String], default: [] },

    dSb: { type: Number, default: 0 },
    dAc: { type: Number, default: 0 },

    dsb: { type: [Number], default: [] },
    dac: { type: [Number], default: [] },
    discLabels: { type: [String], default: [] },

    totalSb: { type: Number, default: 0 },
    totalAc: { type: Number, default: 0 },
    totalVr: { type: Number, default: 0 },

    files: {
      autoUpload: { type: String, default: "" },
      videoUpload: { type: String, default: "" },
      quotation: { type: String, default: "" },
      pricelist: { type: String, default: "" },
      ledger: { type: String, default: "" },
      paymentSlip: { type: String, default: "" },
      other: { type: String, default: "" },
      paymentCard: { type: String, default: "" },
    },
  },
  { timestamps: true }
);
// Index for performance in searches
dealSchema.index({ cname: "text", dname: "text", model: "text", scname: "text" });
dealSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Deal", dealSchema);