import React, { useState } from 'react';

import { Button, Stack, Popover } from '@mui/material';
import { ExpandMore, FilterList } from '@mui/icons-material';

import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import InputField from '@/components/common/InputField';

type InsightsFilterProps = {
  languages: { label: string; value: string }[];
  filters: any;
  setFilters: (filters: any) => void;
};

const schema = yup.object().shape({
  language: yup.string(),
  device: yup.string(),
});

export type FormData = yup.InferType<typeof schema>;

const InsightsFilter = ({
  filters,
  setFilters,
  languages,
}: InsightsFilterProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    setAnchorEl(event.currentTarget);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'filter-popover' : undefined;

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      language: filters.language || 'All',
      device: filters.device || 'All',
    },
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: any) => {
    setFilters(
      Object.fromEntries(
        Object.entries(data)
          .map(([key, value]) => [
            key,
            value === 'All' ? undefined : value,
          ])
          .filter(([, value]) => value !== undefined)
      )
    );
    handleCancel();
  };

  const handleCancel = () => {
    setAnchorEl(null);
  };

  const handleReset = () => {
    reset({
      language: 'All',
      device: 'All',
    });
  };

  return (
    <Stack spacing={2}>
      {/* Button acting as dropdown */}
      <Button
        startIcon={<FilterList />}
        endIcon={<ExpandMore />}
        variant="outlined"
        onClick={handleButtonClick}
      >
        Filters
      </Button>

      {/* Popover Component */}
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleCancel}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <form
          noValidate
          autoComplete="off"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Stack gap={2} padding={2}>
            <InputField
              type="select"
              name="language"
              label="Language"
              control={control}
              errors={errors}
              options={[{ label: 'All', value: 'All' }, ...languages]}
            />
            <InputField
              type="select"
              name="device"
              label="Device"
              control={control}
              errors={errors}
              options={[
                { label: 'All', value: 'All' },
                { label: 'iOS', value: 'iOS' },
                { label: 'Android', value: 'Android' },
              ]}
            />
            <Stack direction="row" alignItems="center" gap={2}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleReset}
              >
                Reset
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                type="submit"
                autoFocus
              >
                Save
              </Button>
            </Stack>
          </Stack>
        </form>
      </Popover>
    </Stack>
  );
};

export default InsightsFilter;
