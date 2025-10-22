import { Router } from 'express';
import { createBook, getAllBooks, getBookDetail, getBooksByGenre, updateBook, deleteBook } from '../controllers/bookController';

const router = Router();

router.post('/', createBook);
router.get('/', getAllBooks);
router.get('/genre/:genre_id', getBooksByGenre);
router.get('/:book_id', getBookDetail);
router.patch('/:book_id', updateBook);
router.delete('/:book_id', deleteBook);

export default router;
