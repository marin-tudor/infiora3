// React imports
import React from "react";

// MUI imports
import {
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";

// Custom imports
import { Close } from "@mui/icons-material";

interface TextDialogProps {
  text?: string;
  onClose: any;
}

const TextDialog: React.FC<TextDialogProps> = ({ text, onClose }) => {
  return (
    <Dialog
      fullWidth
      open={true}
      maxWidth="sm"
      scroll="paper"
      onClose={onClose}
    >
      <DialogContent>
        <IconButton
          sx={{ position: "absolute", top: 0, right: 0, margin: 1 }}
          onClick={onClose}
        >
          <Close />
        </IconButton>
        <Stack gap={2} mt={5}>
          <Typography variant="h5" textAlign="center">
            {text}
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default TextDialog;
