import { Router } from 'express';
import { createGenre, getAllGenres, getGenreDetail, updateGenre, deleteGenre } from '../controllers/genreController';

const router = Router();

router.post('/', createGenre);
router.get('/', getAllGenres);
router.get('/:genre_id', getGenreDetail);
router.patch('/:genre_id', updateGenre);
router.delete('/:genre_id', deleteGenre);

export default router;
