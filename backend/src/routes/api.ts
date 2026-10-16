import { Router } from "express";
import { uploadDocument } from "../controllers/documentController";
import { searchAnswer } from "../controllers/chatController";

const router = Router();

router.post("/documents/upload", uploadDocument);
router.post("/search", searchAnswer);


export default router;
