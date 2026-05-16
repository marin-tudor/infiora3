import { Grid, Typography, Stack, Avatar } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import React from 'react';
import { getInitials } from '@/utils/get-initials';

const UserOverviewTab = ({ user }: any) => {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Stack direction="row" gap={1}>
          <Avatar
            src={user?.image}
            sx={{
              height: 80,
              width: 80,
            }}
          >
            {getInitials(user?.name)}
          </Avatar>
          <Stack gap={2}>
            <Typography variant="h6">{user?.name}</Typography>
            <Stack direction="row" gap={1}>
              <EmailIcon />
              <Typography variant="body1">{user?.email}</Typography>
            </Stack>
          </Stack>
        </Stack>
      </Grid>
      <Grid item xs={8} md={6}></Grid>
    </Grid>
  );
};

export default UserOverviewTab;
