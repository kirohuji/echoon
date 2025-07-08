import type { Breakpoint } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import { Link } from 'react-router-dom';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import { useState } from 'react';

export type FooterProps = {
  layoutQuery: Breakpoint;
};

export function MainFooter({ layoutQuery }: FooterProps) {
  const [bottomNavigationActionValue, setBottomNavigationActionValue] = useState('chat')
  return (
    <Paper
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        background: 'none',
      }}
      elevation={5}
      className="bottom-navigation"
    >
      <BottomNavigation
        id="bottom-navigation"
        value={bottomNavigationActionValue}
        onChange={(e, newValue) => {
          setBottomNavigationActionValue(newValue)
        }}
      >
        <BottomNavigationAction component={Link} sx={{ pt: 0, opacity: 1 }} label="聊天" to="/main/chat" />
      </BottomNavigation>
    </Paper>
  )
}