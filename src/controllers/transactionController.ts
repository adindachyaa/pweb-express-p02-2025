import { Request, Response } from "express";
import prisma from "../utils/prisma";

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items are required to create a transaction",
      });
    }

    // Ambil buku yang dipesan
    const bookIds = items.map((item) => item.bookId);
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } },
    });

    let totalAmount = 0;

    // Validasi stok dan hitung total
    for (const item of items) {
      const book = books.find((b) => b.id === item.bookId);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: `Book with ID ${item.bookId} not found`,
        });
      }

      if (book.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for book ${book.title}`,
        });
      }

      totalAmount += book.price * item.quantity;
    }

    const transaction = await prisma.$transaction(async (prismaClient) => {
      // Buat transaksi utama
      const newTransaction = await prismaClient.transaction.create({
        data: {
          userId: (req as any).user.id,
          totalAmount,
          transactionDetails: {
            create: items.map((item) => {
              const book = books.find((b) => b.id === item.bookId)!;
              return {
                bookId: item.bookId,
                quantity: item.quantity,
                price: book.price,
                subtotal: book.price * item.quantity,
              };
            }),
          },
        },
        include: {
          transactionDetails: { include: { book: true } },
          user: true,
        },
      });

      // Update stok buku
      for (const item of items) {
        await prismaClient.book.update({
          where: { id: item.bookId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newTransaction;
    });

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: transaction,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to create transaction",
    });
  }
};

//  GET ALL TRANSACTIONS
export const getAllTransactions = async (_req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        user: true,
        transactionDetails: { include: { book: true } },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Transactions retrieved successfully",
      data: transactions,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
    });
  }
};

//  GET TRANSACTION DETAIL
export const getTransactionDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // <-- harus sama dengan route parameter
    const transaction = await prisma.transaction.findUnique({
      where: { id }, // pakai id dari URL
      include: {
        user: true,
        transactionDetails: {
          include: { book: true },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction detail retrieved successfully",
      data: transaction,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transaction detail",
    });
  }
};

//  GET TRANSACTION STATISTICS
export const getTransactionStatistics = async (_req: Request, res: Response) => {
  try {
    const stats = await prisma.transaction.aggregate({
      _sum: { totalAmount: true },
      _count: true,
    });

    const totalBooks = await prisma.transactionDetail.aggregate({
      _sum: { quantity: true },
    });

    return res.status(200).json({
      success: true,
      message: "Transaction statistics retrieved successfully",
      data: {
        totalTransactions: stats._count,
        totalBooksSold: totalBooks._sum?.quantity || 0,
        totalRevenue: stats._sum?.totalAmount || 0,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transaction statistics",
    });
  }
};
