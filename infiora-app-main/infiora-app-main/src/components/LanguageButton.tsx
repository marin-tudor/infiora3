import { useState } from "react";
import { IconButton, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { ILanguage } from "@/types";
import { useRoom } from "@/contexts/RoomContext";

// Flag emojis show as two-letter codes on Windows — use CDN images instead.
// Extracts ISO country code from a flag emoji (e.g. 🇬🇧 → "gb").
const flagEmojiToCountryCode = (flag?: string): string => {
  if (!flag) return "un";
  try {
    return Array.from(flag)
      .map((c) => String.fromCharCode(c.codePointAt(0)! - 127397))
      .join("")
      .toLowerCase();
  } catch {
    return "un";
  }
};

const FlagImage = ({ flag, name }: { flag?: string; name?: string }) => {
  const code = flagEmojiToCountryCode(flag);
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width={22}
      height={16}
      alt={name || ""}
      style={{ borderRadius: 2, objectFit: "cover", display: "block" }}
      onError={(e) => {
        (e.target as HTMLImageElement).src = `https://flagcdn.com/w40/un.png`;
      }}
    />
  );
};

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
            backgroundColor: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(4px)",
            "&:hover": { backgroundColor: "rgba(255,255,255,0.95)" },
            width: 36,
            height: 36,
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            p: 0,
          }}
        >
          <FlagImage flag={language?.flag} name={language?.name} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{ paper: { sx: { maxHeight: 280, minWidth: 170 } } }}
      >
        {languages.map((lang) => (
          <MenuItem
            key={lang.name}
            selected={language?.name === lang.name}
            onClick={() => handleSelect(lang)}
            sx={{ gap: 1.5 }}
          >
            <FlagImage flag={lang.flag} name={lang.name} />
            <Typography variant="body2">{lang.name}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageButton;
