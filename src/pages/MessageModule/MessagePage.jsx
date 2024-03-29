import {
  Grid,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  LinearProgress,
  Box,
  IconButton,
} from '@mui/material';
import React, { createRef, useCallback, useEffect, useMemo, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useAppDispatch, useAppSelector } from 'src/configs/store';
import {
  getAllChatRoom,
  setConnectionStatus,
  setOfferSignal,
  setSelectedChatRoom,
} from './message.reducer';
import ChatArea from './ChatArea';
import { getUserAuthentication, isAdmin, isDoctor, isUser } from 'src/shared/util/auth-util';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ConnectionStatus } from './constant';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getDoctorSchedules,
  getPatientSchedules,
} from '../ScheduleManagerModule/schedule-manager.reducer';
import { ApiSingleton } from 'src/configs/singleton-api';

const MessagePage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Get only first time
  const userData = useMemo(() => getUserAuthentication(), []);

  const rooms = useAppSelector(state => state.message.chatRoomList);
  const selectedRoom = useAppSelector(state => state.message.selectedChatRoom);

  // Related to schedule reducer
  const scheduleLoading = useAppSelector(state => state.scheduleManager.loading);
  const scheduleList = useAppSelector(state => state.scheduleManager.scheduleList);
  const [activeCallButton, setActiveCallButton] = useState(false);

  const [sendInfo, setSendInfo] = useState({
    from: null,
    to: null,
  });

  /**
   * Calc videoCallSocket url when account change
   * @return {WebSocket | null} new WebSocket or null
   */
  const videoCallSocket = useMemo(() => {
    if (sendInfo && sendInfo.from) {
      // return new WebSocket('ws://localhost:8080/videochat/' + sendInfo.from);
      return new WebSocket(
        `wss://${ApiSingleton.getInstance().instance.host}/videochat/${sendInfo.from}`
      );
    } else {
      return null;
    }
  }, [sendInfo]);

  useEffect(() => {
    dispatch(getAllChatRoom());
    if (isDoctor(userData)) {
      dispatch(getDoctorSchedules(userData.sub));
    } else if (isAdmin(userData) || isUser(userData)) {
      dispatch(getPatientSchedules(userData.sub));
    } else {
      toast.error('You are not authorized to access this page');
    }
  }, []);

  const canVideoCall = () => {
    const now = Date.now();
    // ! Only two user on chat room
    const callerLogin = selectedRoom.users
      .filter(user => user.login !== userData.sub)
      .map(user => user.login)[0];

    for (const schedule of scheduleList) {
      if (isDoctor(userData)) {
        if (schedule.user.login === callerLogin) {
          if (Date.parse(schedule.startAt) <= now && Date.parse(schedule.endAt) >= now) return true;
        }
      } else {
        if (schedule.doctor.login === callerLogin) {
          if (Date.parse(schedule.startAt) <= now && Date.parse(schedule.endAt) >= now) return true;
        }
      }
    }

    return false;
  };

  useEffect(() => {
    if (selectedRoom && scheduleList && scheduleList.length > 0) {
      const canCall = canVideoCall();
      setActiveCallButton(canCall);
    }
  }, [selectedRoom, scheduleList, userData]);

  useEffect(() => {
    if (rooms && rooms.length > 0) {
      const room = rooms[0];
      if (room) {
        const from = room.users.filter(user => user.login === userData.sub)[0].id;
        setSendInfo({ from, to: null });
      }
    }
  }, [rooms]);

  useEffect(() => {
    if (selectedRoom) {
      const to = selectedRoom.users.filter(user => user.login !== userData.sub)[0].id;
      setSendInfo({ ...sendInfo, to });
    }
  }, [selectedRoom]);

  useEffect(() => {
    if (videoCallSocket) {
      videoCallSocket.onmessage = message => {
        const data = JSON.parse(message.data);
        if (data?.type === 'offer') {
          dispatch(setConnectionStatus(ConnectionStatus.RECEIVING));
          dispatch(setOfferSignal(data));
          navigate(`/message/from/${data.to}/to/${data.from}`, {
            state: { backgroundLocation: location },
          });
        }
      };
    }
  }, [videoCallSocket]);

  const onClickRoom = room => {
    dispatch(setSelectedChatRoom(room));
  };

  const makeCall = () => {
    if (sendInfo.from && sendInfo.to) {
      navigate(`/message/from/${sendInfo.from}/to/${sendInfo.to}`, {
        state: { backgroundLocation: location },
      });
    } else {
      toast.error('Please select a room');
    }
  };

  const loadMoreRoom = () => {
    console.log('load more room');
  };

  return (
    <Grid
      container
      ml={3}
      mt={3}
      mb={3}
      component={Paper}
      sx={{ width: '100%', height: '100%' }}
      spacing={0}
    >
      <Grid item md={9} sm={11} sx={{ borderRight: '1px solid #e0e0e0' }}>
        <Box component="div" display="flex" flexDirection="column">
          <Box
            component={Paper}
            variant="outlined"
            square
            display="flex"
            padding={1}
            flexDirection="row"
            justifyContent="left"
            justifyItems="left"
          >
            <IconButton color="info" onClick={makeCall} disabled={!activeCallButton}>
              <FontAwesomeIcon icon="video" />
            </IconButton>
          </Box>
          <ChatArea />
        </Box>
      </Grid>
      <Grid item md={3} sm={1} sx={{ padding: 0 }}>
        <List sx={{ padding: 3 }}>
          <InfiniteScroll
            dataLength={rooms.length}
            next={loadMoreRoom}
            height="100%"
            style={{ display: 'flex', flexDirection: 'column' }}
            hasMore={true}
            loader={<LinearProgress />}
          >
            {rooms.map(item => (
              <ListItem
                key={item.id}
                component={Button}
                variant="outlined"
                sx={{ marginBottom: '5px' }}
                onClick={() => onClickRoom(item)}
              >
                <ListItemAvatar>
                  <Avatar />
                </ListItemAvatar>
                <ListItemText
                  // Only for 2 users
                  primary={item.users
                    .filter(user => user.login !== userData.sub)
                    .map(user => user.login)}
                />
              </ListItem>
            ))}
          </InfiniteScroll>
        </List>
      </Grid>
    </Grid>
  );
};
export default MessagePage;
