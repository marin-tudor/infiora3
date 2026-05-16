import type { ComponentType } from 'react';
import React, { useState } from 'react';

import {
  Button,
  Menu,
  MenuItem,
  Popover,
  Stack,
} from '@mui/material';
import {
  format,
  startOfToday,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  endOfToday,
  formatISO,
  endOfDay,
} from 'date-fns';
import { DateRangePicker as ReactDateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css'; // main style file
import 'react-date-range/dist/theme/default.css'; // theme css file
import { CalendarToday, ExpandMore } from '@mui/icons-material';
import { enGB } from 'date-fns/locale';

const DateRangePicker = ReactDateRangePicker as ComponentType<any>;

type Range = {
  startDate?: string;
  endDate?: string;
};

type RangePickerProps = {
  range: Range;
  setRange: (dates: Range) => void;
};

const RangePicker = ({ range, setRange }: RangePickerProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [customAnchorEl, setCustomAnchorEl] =
    useState<null | HTMLElement>(null);

  const [selectionRange, setSelectionRange] = useState({
    startDate: range.startDate
      ? new Date(range.startDate)
      : startOfToday(),
    endDate: range.endDate ? new Date(range.endDate) : endOfToday(),
    key: 'selection',
  });

  const [selectedOption, setSelectedOption] = useState<string>(
    range?.startDate ? 'Custom' : 'Today'
  );

  const handleButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSelectChange = (option: string) => {
    setSelectedOption(option);
    setAnchorEl(null);

    const start = startOfToday();
    const end = endOfToday();
    let s = start;
    let e = end;

    switch (option) {
      case 'Yesterday':
        const yesterday = subDays(start, 1);

        s = yesterday;
        e = endOfDay(yesterday);
        break;
      case 'This Week':
        s = startOfWeek(start, { weekStartsOn: 1 }); // Monday as the start
        e = endOfWeek(start, { weekStartsOn: 1 });
        break;
      case 'Last 7 Days':
        s = subDays(start, 6); // Include today
        e = end;
        break;
      case 'This Month':
        s = startOfMonth(start);
        e = endOfMonth(start);
        break;
      case 'Last 30 Days':
        s = subDays(start, 29); // Include today
        e = end;
        break;
      case 'Custom':
        setCustomAnchorEl(anchorEl);

        return; // Exit early to avoid setting range
      default:
        break;
    }

    setRange({
      startDate: formatISO(s, { representation: 'complete' }),
      endDate: formatISO(e, { representation: 'complete' }),
    });
  };

  const handleCustomClose = () => {
    setCustomAnchorEl(null);
    setRange({
      startDate: formatISO(selectionRange.startDate, {
        representation: 'complete',
      }),
      endDate: formatISO(selectionRange.endDate, {
        representation: 'complete',
      }),
    });
  };

  const handleCustomSelect = (ranges: any) => {
    setSelectionRange(ranges.selection);
  };

  return (
    <Stack spacing={2}>
      {/* Button acting as dropdown */}
      <Button
        startIcon={<CalendarToday />}
        endIcon={<ExpandMore />}
        variant="outlined"
        onClick={handleButtonClick}
      >
        {selectedOption === 'Custom'
          ? `${format(
              selectionRange.startDate,
              'MMM d, yyyy'
            )} - ${format(selectionRange.endDate, 'MMM d, yyyy')}`
          : selectedOption}
      </Button>

      {/* Menu for dropdown options */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        {[
          'Today',
          'Yesterday',
          'This Week',
          'Last 7 Days',
          'This Month',
          'Last 30 Days',
          'Custom',
        ].map((option) => (
          <MenuItem
            key={option}
            onClick={() => handleSelectChange(option)}
          >
            {option}
          </MenuItem>
        ))}
      </Menu>

      {/* Popover for custom date range picker */}
      <Popover
        open={Boolean(customAnchorEl)}
        anchorEl={customAnchorEl}
        onClose={handleCustomClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Stack sx={{ padding: 2 }}>
          <DateRangePicker
            locale={enGB}
            ranges={[selectionRange]}
            onChange={handleCustomSelect}
          />
        </Stack>
      </Popover>
    </Stack>
  );
};

export default RangePicker;
