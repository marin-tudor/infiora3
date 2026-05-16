import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PropTypes from 'prop-types';
import {
  Box,
  Divider,
  MenuItem,
  MenuList,
  Popover,
  Typography,
} from '@mui/material';
import { useAppSelector } from '@/redux/store';
import { useAppDispatch } from '@/redux/store';
import { useLogoutUserMutation } from '@/redux/api/authApi';
import { logout as clearUser } from '@/redux/features/userSlice';

export const AccountPopover = (props: any) => {
  const { anchorEl, onClose, open } = props;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [logoutUser] = useLogoutUserMutation();

  const user = useAppSelector((state) => state.userState.user);

  const handleSignOut = useCallback(() => {
    onClose?.();
    logoutUser()
      .unwrap()
      .catch(() => undefined)
      .finally(() => {
        dispatch(clearUser());
        router.push('/login');
      });
  }, [dispatch, logoutUser, onClose, router]);

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{
        horizontal: 'left',
        vertical: 'bottom',
      }}
      onClose={onClose}
      open={open}
      PaperProps={{ sx: { width: 200 } }}
    >
      <Box
        sx={{
          py: 1.5,
          px: 2,
        }}
      >
        <Typography variant="overline">
          {user?.firstName} {user?.lastName}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Admin
        </Typography>
      </Box>
      <Divider />
      <MenuList
        disablePadding
        dense
        sx={{
          p: '8px',
          '& > *': {
            borderRadius: 1,
          },
        }}
      >
        {/* <MenuItem onClick={() => router.push('/account')}>
          Account
        </MenuItem> */}
        <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
      </MenuList>
    </Popover>
  );
};

AccountPopover.propTypes = {
  anchorEl: PropTypes.any,
  onClose: PropTypes.func,
  open: PropTypes.bool.isRequired,
};
