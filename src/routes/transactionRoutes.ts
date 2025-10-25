import { Router } from "express";
import {
  createTransaction,
  getAllTransactions,
  getTransactionDetail,
  getTransactionStatistics,
} from "../controllers/transactionController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// CREATE transaction (hanya user login)
router.post("/", authMiddleware, createTransaction);

// READ all transactions
router.get("/", getAllTransactions);

// GET statistics (harus diletakkan sebelum :transaction_id)
router.get("/statistics", getTransactionStatistics);

// GET transaction detail by ID
router.get("/:id", getTransactionDetail);

export default router;
