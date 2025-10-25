// src/controllers/genreController.ts
import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Create Genre
export const createGenre = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Genre name is required'
      });
      return;
    }

    const existingGenre = await prisma.genre.findUnique({
      where: { name } // field 'name' exists in model
    });

    if (existingGenre) {
      res.status(400).json({
        success: false,
        message: 'Genre already exists'
      });
      return;
    }

    const genre = await prisma.genre.create({
      data: { name }
    });

    res.status(201).json({
      success: true,
      message: 'Genre created successfully',
      data: genre
    });
  } catch (error: any) {
    console.error('❌ CREATE GENRE ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message || String(error)
    });
  }
};

// Get All Genres
export const getAllGenres = async (_req: Request, res: Response): Promise<void> => {
  try {
    const genres = await prisma.genre.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, createdAt: true, updatedAt: true } // pilih field yang mau return
    });

    // jika mau menyesuaikan key createdAt -> created_at, lakukan mapping di sini
    res.status(200).json({
      success: true,
      message: 'Genres retrieved successfully',
      data: genres
    });
  } catch (error: any) {
    console.error('❌ GET ALL GENRES ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get Genre Detail
export const getGenreDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const genreId = req.params.genre_id as string; // route param tetap genre_id

    // gunakan field 'id' di Prisma (tipe string/UUID)
    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
      include: {
        books: {
          select: { id: true, title: true, author: true, price: true, stock: true }
        }
      }
    });

    if (!genre) {
      res.status(404).json({
        success: false,
        message: 'Genre not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Genre detail retrieved successfully',
      data: genre
    });
  } catch (error: any) {
    console.error('❌ GET GENRE DETAIL ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update Genre
export const updateGenre = async (req: Request, res: Response): Promise<void> => {
  try {
    const genreId = req.params.genre_id as string;
    const { name } = req.body;

    // optional: cek duplikasi nama
    if (name) {
      const dup = await prisma.genre.findUnique({ where: { name } });
      if (dup && dup.id !== genreId) {
        res.status(400).json({ success: false, message: 'Genre name already exists' });
        return;
      }
    }

    const updatedGenre = await prisma.genre.update({
      where: { id: genreId },
      data: { ...(name !== undefined && { name }) }
    });

    res.status(200).json({
      success: true,
      message: 'Genre updated successfully',
      data: updatedGenre
    });
  } catch (error: any) {
    console.error('❌ UPDATE GENRE ERROR:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Genre not found' });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete Genre
export const deleteGenre = async (req: Request, res: Response): Promise<void> => {
  try {
    const genreId = req.params.genre_id as string;

    // cek dulu apakah ada buku pada genre
    const booksCount = await prisma.book.count({ where: { genreId: genreId } });
    if (booksCount > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete genre with existing books'
      });
      return;
    }

    await prisma.genre.delete({
      where: { id: genreId }
    });

    res.status(200).json({
      success: true,
      message: 'Genre deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ DELETE GENRE ERROR:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Genre not found' });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
