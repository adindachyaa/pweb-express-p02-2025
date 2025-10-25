import { Router } from "express";
import {
  createGenre,
  getAllGenres,
  getGenreDetail,
  updateGenre,
  deleteGenre,
} from "../controllers/genreController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// CREATE genre (admin-only, opsional bisa pakai authMiddleware)
router.post("/", authMiddleware, createGenre);

// READ all genres
router.get("/", getAllGenres);

// READ genre detail by ID
router.get("/:genre_id", getGenreDetail);

// UPDATE genre (admin-only)
router.patch("/:genre_id", authMiddleware, updateGenre);

// DELETE genre (admin-only)
router.delete("/:genre_id", authMiddleware, deleteGenre);

export default router;
