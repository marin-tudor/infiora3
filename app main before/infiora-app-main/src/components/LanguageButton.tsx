import { useState } from "react";
import {
  Button,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { ILanguage } from "@/types";
import { useRoom } from "@/contexts/RoomContext";

const LanguageButton = ({
  language,
  setLanguage,
}: {
  language?: ILanguage;
  setLanguage: (lang: ILanguage) => Promise<void>;
}) => {
  const { languages } = useRoom();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (lang: ILanguage) => {
    setLanguage(lang);
    handleClose();
  };

  return (
    <>
      <Tooltip title={language?.name}>
        <IconButton
          onClick={handleOpen}
          size="small"
          sx={{
            backgroundColor: "grey.300",
            "&:hover": { backgroundColor: "grey.300" },
            width: 35,
          }}
        >
          {language?.flag}
        </IconButton>
      </Tooltip>
      <Menu
        sx={{ height: "270px" }}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {languages.map((lang) => (
          <MenuItem
            color="secondary"
            sx={{ width: "200px" }}
            key={lang.name}
            selected={language?.name === lang.name}
            onClick={() => handleSelect(lang)}
          >
            {lang.flag} {lang.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageButton;
