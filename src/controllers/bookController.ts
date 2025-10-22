import { Request, Response } from "express";
import prisma from "../prisma";

export const createBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      writer,
      publisher,
      description,
      publication_year,
      price,
      stock_quantity,
      genre_id,
      genre
    } = req.body;

    if (!title || !writer || !publisher || !publication_year || !price || !stock_quantity) {
      res.status(400).json({
        success: false,
        message: "All required fields must be provided"
      });
      return;
    }

    const existingBook = await prisma.book.findFirst({
      where: { OR: [{ title }, { isbn: title }] }
    });

    if (existingBook) {
      res.status(400).json({
        success: false,
        message: "Book with this title or ISBN already exists"
      });
      return;
    }

    let genreRecord = null;

    if (genre_id) {
      genreRecord = await prisma.genre.findUnique({ where: { id: genre_id } });
      if (!genreRecord) {
        res.status(404).json({
          success: false,
          message: `Genre with id ${genre_id} not found`
        });
        return;
      }
    } else if (genre && genre.trim() !== "") {
      genreRecord = await prisma.genre.findFirst({
        where: { name: { equals: genre.trim(), mode: "insensitive" } }
      });
      if (!genreRecord) {
        genreRecord = await prisma.genre.create({
          data: { name: genre.trim() }
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: "Please provide a genre name or genre_id"
      });
      return;
    }

    const book = await prisma.book.create({
      data: {
        title,
        author: writer,
        publisher,
        publicationYear: parseInt(publication_year),
        isbn: `ISBN-${Date.now()}`,
        price: parseFloat(price),
        stock: parseInt(stock_quantity),
        description,
        genreId: genreRecord.id
      },
      include: { genre: true }
    });

    res.status(201).json({
      success: true,
      message: "Book created successfully",
      data: book
    });
  } catch (error) {
    console.error("CREATE BOOK ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const getAllBooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search, author, publisher, minPrice, maxPrice } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { author: { contains: search as string, mode: 'insensitive' } },
        { isbn: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (author) {
      where.author = { contains: author as string, mode: 'insensitive' };
    }

    if (publisher) {
      where.publisher = { contains: publisher as string, mode: 'insensitive' };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          genre: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.book.count({ where })
    ]);

    res.status(200).json({
      success: true,
      message: 'Books retrieved successfully',
      data: books,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getBookDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { book_id } = req.params;

    const book = await prisma.book.findUnique({
      where: { id: book_id },
      include: {
        genre: true
      }
    });

    if (!book) {
      res.status(404).json({
        success: false,
        message: 'Book not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Book details retrieved successfully',
      data: book
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getBooksByGenre = async (req: Request, res: Response): Promise<void> => {
  try {
    const { genre_id } = req.params;
    const { page = '1', limit = '10', search, author, minPrice, maxPrice } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const genre = await prisma.genre.findUnique({
      where: { id: genre_id }
    });

    if (!genre) {
      res.status(404).json({
        success: false,
        message: 'Genre not found'
      });
      return;
    }

    const where: any = { genreId: genre_id };

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { author: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (author) {
      where.author = { contains: author as string, mode: 'insensitive' };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          genre: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.book.count({ where })
    ]);

    res.status(200).json({
      success: true,
      message: 'Books retrieved successfully',
      data: books,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { book_id } = req.params;
    const { title, author, publisher, publicationYear, isbn, price, stock, description, genreId } = req.body;

    const existingBook = await prisma.book.findUnique({
      where: { id: book_id }
    });

    if (!existingBook) {
      res.status(404).json({
        success: false,
        message: 'Book not found'
      });
      return;
    }

    if (title && title !== existingBook.title) {
      const duplicateTitle = await prisma.book.findUnique({
        where: { title }
      });

      if (duplicateTitle) {
        res.status(400).json({
          success: false,
          message: 'Book title already exists'
        });
        return;
      }
    }

    if (isbn && isbn !== existingBook.isbn) {
      const duplicateIsbn = await prisma.book.findUnique({
        where: { isbn }
      });

      if (duplicateIsbn) {
        res.status(400).json({
          success: false,
          message: 'ISBN already exists'
        });
        return;
      }
    }

    if (genreId && genreId !== existingBook.genreId) {
      const genre = await prisma.genre.findUnique({
        where: { id: genreId }
      });

      if (!genre) {
        res.status(404).json({
          success: false,
          message: 'Genre not found'
        });
        return;
      }
    }

    const updatedBook = await prisma.book.update({
      where: { id: book_id },
      data: {
        ...(title && { title }),
        ...(author && { author }),
        ...(publisher && { publisher }),
        ...(publicationYear && { publicationYear: parseInt(publicationYear) }),
        ...(isbn && { isbn }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(description !== undefined && { description }),
        ...(genreId && { genreId })
      },
      include: {
        genre: true
      }
    });

    res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      data: updatedBook
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const deleteBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { book_id } = req.params;

    const book = await prisma.book.findUnique({
      where: { id: book_id }
    });

    if (!book) {
      res.status(404).json({
        success: false,
        message: 'Book not found'
      });
      return;
    }

    await prisma.book.delete({
      where: { id: book_id }
    });

    res.status(200).json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
