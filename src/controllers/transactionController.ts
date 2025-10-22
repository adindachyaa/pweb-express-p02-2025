import { Request, Response } from 'express';
import prisma from '../prisma';

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { items } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Items are required'
      });
      return;
    }

    for (const item of items) {
      if (!item.bookId || !item.quantity || item.quantity <= 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid item data'
        });
        return;
      }
    }

    const bookIds = items.map(item => item.bookId);
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } }
    });

    if (books.length !== bookIds.length) {
      res.status(404).json({
        success: false,
        message: 'One or more books not found'
      });
      return;
    }

    for (const item of items) {
      const book = books.find(b => b.id === item.bookId);
      if (!book) {
        res.status(404).json({
          success: false,
          message: `Book not found`
        });
        return;
      }

      if (book.stock < item.quantity) {
        res.status(400).json({
          success: false,
          message: `Insufficient stock for book: ${book.title}`
        });
        return;
      }
    }

    let totalAmount = 0;
    const transactionDetails = [];

    for (const item of items) {
      const book = books.find(b => b.id === item.bookId);
      if (book) {
        const subtotal = book.price * item.quantity;
        totalAmount += subtotal;

        transactionDetails.push({
          bookId: item.bookId,
          quantity: item.quantity,
          price: book.price,
          subtotal
        });
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        totalAmount,
        transactionDetails: {
          create: transactionDetails
        }
      },
      include: {
        transactionDetails: {
          include: {
            book: {
              include: {
                genre: true
              }
            }
          }
        }
      }
    });

    for (const item of items) {
      await prisma.book.update({
        where: { id: item.bookId },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        transactionDetails: {
          include: {
            book: {
              include: {
                genre: true
              }
            }
          }
        }
      },
      orderBy: {
        transactionDate: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getTransactionDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transaction_id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id: transaction_id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        transactionDetails: {
          include: {
            book: {
              include: {
                genre: true
              }
            }
          }
        }
      }
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Transaction details retrieved successfully',
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getTransactionStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        transactionDetails: {
          include: {
            book: {
              include: {
                genre: true
              }
            }
          }
        }
      }
    });

    const totalTransactions = transactions.length;

    const totalAmount = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const averageTransaction = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    const genreCount: Record<string, { count: number; name: string }> = {};

    transactions.forEach(transaction => {
      transaction.transactionDetails.forEach(detail => {
        const genreId = detail.book.genreId;
        const genreName = detail.book.genre.name;

        if (!genreCount[genreId]) {
          genreCount[genreId] = { count: 0, name: genreName };
        }
        genreCount[genreId].count += detail.quantity;
      });
    });

    const genreEntries = Object.entries(genreCount);

    let mostPopularGenre = null;
    let leastPopularGenre = null;

    if (genreEntries.length > 0) {
      genreEntries.sort((a, b) => b[1].count - a[1].count);

      mostPopularGenre = {
        genreId: genreEntries[0][0],
        genreName: genreEntries[0][1].name,
        totalTransactions: genreEntries[0][1].count
      };

      leastPopularGenre = {
        genreId: genreEntries[genreEntries.length - 1][0],
        genreName: genreEntries[genreEntries.length - 1][1].name,
        totalTransactions: genreEntries[genreEntries.length - 1][1].count
      };
    }

    res.status(200).json({
      success: true,
      message: 'Transaction statistics retrieved successfully',
      data: {
        totalTransactions,
        averageTransaction,
        mostPopularGenre,
        leastPopularGenre
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
