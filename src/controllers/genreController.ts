import { Request, Response } from 'express';
import prisma from '../prisma';

export const createGenre = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Genre name is required'
      });
      return;
    }

    const existingGenre = await prisma.genre.findUnique({
      where: { name }
    });

    if (existingGenre) {
      res.status(400).json({
        success: false,
        message: 'Genre already exists'
      });
      return;
    }

    const genre = await prisma.genre.create({
      data: {
        name,
        description
      }
    });

    res.status(201).json({
      success: true,
      message: 'Genre created successfully',
      data: genre
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getAllGenres = async (req: Request, res: Response): Promise<void> => {
  try {
    const genres = await prisma.genre.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Genres retrieved successfully',
      data: genres
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getGenreDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { genre_id } = req.params;

    const genre = await prisma.genre.findUnique({
      where: { id: genre_id },
      include: {
        books: {
          select: {
            id: true,
            title: true,
            author: true,
            price: true,
            stock: true
          }
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
      message: 'Genre details retrieved successfully',
      data: genre
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateGenre = async (req: Request, res: Response): Promise<void> => {
  try {
    const { genre_id } = req.params;
    const { name, description } = req.body;

    const existingGenre = await prisma.genre.findUnique({
      where: { id: genre_id }
    });

    if (!existingGenre) {
      res.status(404).json({
        success: false,
        message: 'Genre not found'
      });
      return;
    }

    if (name && name !== existingGenre.name) {
      const duplicateGenre = await prisma.genre.findUnique({
        where: { name }
      });

      if (duplicateGenre) {
        res.status(400).json({
          success: false,
          message: 'Genre name already exists'
        });
        return;
      }
    }

    const updatedGenre = await prisma.genre.update({
      where: { id: genre_id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description })
      }
    });

    res.status(200).json({
      success: true,
      message: 'Genre updated successfully',
      data: updatedGenre
    });
    } catch (error) {
    console.error('GENRE ERROR:', error);
    res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error instanceof Error ? error.message : String(error)
  });
}
};

export const deleteGenre = async (req: Request, res: Response): Promise<void> => {
  try {
    const { genre_id } = req.params;

    const genre = await prisma.genre.findUnique({
      where: { id: genre_id },
      include: {
        books: true
      }
    });

    if (!genre) {
      res.status(404).json({
        success: false,
        message: 'Genre not found'
      });
      return;
    }

    if (genre.books.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete genre with existing books'
      });
      return;
    }

    await prisma.genre.delete({
      where: { id: genre_id }
    });

    res.status(200).json({
      success: true,
      message: 'Genre deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
