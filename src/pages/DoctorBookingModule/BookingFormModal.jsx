import {
  Modal,
  Typography,
  Box,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Button,
  List,
  ListItem,
  Alert,
} from '@mui/material';
import AdapterDayJS from '@mui/lab/AdapterDayjs';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import TimePicker from '@mui/lab/TimePicker';
import DatePicker from '@mui/lab/DatePicker';
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from 'src/configs/store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getScheduleOfDoctorAtDate,
  createDoctorSchedule,
  resetBookingCompleted,
} from './booking.reducer';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { combineDateAndTime, extractTimeFromString } from 'src/shared/util/time-ultil';
import dayjs from 'dayjs';
import { getUserAuthentication } from 'src/shared/util/auth-util';

const BookingFormModal = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [open, setOpen] = useState(true);

  const { handleSubmit, watch, control } = useForm({
    defaultValues: {
      date: Date.now(),
      startAt: Date.now() + 3600000, // + 1 hour
      endAt: Date.now() + 5400000, // + 1 hour 30 minus
    },
  });

  const currentAccount = getUserAuthentication();
  const loading = useAppSelector(state => state.bookingDoctor.loading);
  const scheduleList = useAppSelector(state => state.bookingDoctor.scheduleList);
  const bookingCompleted = useAppSelector(state => state.bookingDoctor.bookingCompleted);
  const errorMessage = useAppSelector(state => state.bookingDoctor.errorMessage);

  const watchDate = watch('date');

  useEffect(() => {
    if (watchDate && open) {
      const selectedDate = dayjs(watchDate).format('YYYY-MM-DDTHH:mm:ss[Z]');
      dispatch(getScheduleOfDoctorAtDate({ doctorId, date: selectedDate }));
    }
  }, [watchDate, open]);

  useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (bookingCompleted && !loading) {
      toast.success('Booking completed');
      dispatch(resetBookingCompleted()); // for next booking
      handleClose();
    }
  }, [loading, bookingCompleted]);

  const handleClose = () => {
    setOpen(false);
    navigate('/doctor-booking');
  };

  const onSubmit = values => {
    const { date, startAt, endAt } = values; // not DayJS object

    const startTime = combineDateAndTime(date, startAt);
    const endTime = combineDateAndTime(date, endAt);

    const begin = new Date(startTime);
    const end = new Date(endTime);

    if (begin >= end) {
      toast.error("Start time can't be greater than end time");
      return;
    }

    if (begin <= Date.now()) {
      toast.error("Start time can't be equal or less than current time");
      return;
    }

    const schedule = {
      startAt: startTime,
      endAt: endTime,
      doctor: {
        id: doctorId,
      },
      user: {
        login: currentAccount.sub,
      },
    };
    dispatch(createDoctorSchedule(schedule));
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="Booking Modal"
      aria-describedby="doctor-booking-modal"
    >
      <Box
        sx={{
          top: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'absolute',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <FontAwesomeIcon icon="calendar-plus" />
        </Avatar>
        <Typography variant="h5">You want to book doctor {doctorId} ?</Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 2 }}>
          <Controller
            control={control}
            name="date"
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value, ref }, fieldState: { error } }) => (
              <LocalizationProvider dateAdapter={AdapterDayJS}>
                <DatePicker
                  label="Select Date"
                  value={value}
                  onBlur={onBlur}
                  onChange={onChange}
                  renderInput={params => (
                    <TextField {...params} margin="normal" fullWidth helperText={error?.message} />
                  )}
                />
              </LocalizationProvider>
            )}
          />
          <Controller
            control={control}
            name="startAt"
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value, ref }, fieldState: { error } }) => (
              <LocalizationProvider dateAdapter={AdapterDayJS}>
                <TimePicker
                  label="Start time"
                  ampm={false}
                  openTo="hours"
                  views={['hours', 'minutes']}
                  inputFormat="HH:mm:ss"
                  mask="__:__:__"
                  value={value}
                  onBlur={onBlur}
                  onChange={onChange}
                  renderInput={params => (
                    <TextField {...params} margin="normal" fullWidth helperText={error?.message} />
                  )}
                />
              </LocalizationProvider>
            )}
          />
          <Controller
            control={control}
            name="endAt"
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value, ref }, fieldState: { error } }) => (
              <LocalizationProvider dateAdapter={AdapterDayJS}>
                <TimePicker
                  label="End time"
                  ampm={false}
                  openTo="hours"
                  views={['hours', 'minutes']}
                  inputFormat="HH:mm:ss"
                  mask="__:__:__"
                  value={value}
                  onBlur={onBlur}
                  onChange={onChange}
                  renderInput={params => (
                    <TextField {...params} margin="normal" fullWidth helperText={error?.message} />
                  )}
                />
              </LocalizationProvider>
            )}
          />

          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
            Book
          </Button>
        </Box>
        <Accordion>
          <AccordionSummary expandIcon={<FontAwesomeIcon icon="arrow-down" />}>
            The time doctor was busy ...
          </AccordionSummary>
          <AccordionDetails>
            {!errorMessage && (
              <List>
                {scheduleList && scheduleList.length > 0 ? (
                  scheduleList.map(schedule => (
                    <ListItem
                      key={schedule.id}
                      sx={{ display: 'flex', justifyContent: 'space-between' }}
                    >
                      <Alert severity="info">
                        {extractTimeFromString(schedule.startAt)}
                        &nbsp;-&nbsp;
                        {extractTimeFromString(schedule.endAt)}
                      </Alert>
                    </ListItem>
                  ))
                ) : (
                  <ListItem key="no-schedule">
                    <Typography variant="body1">Doctor not busy at that day</Typography>
                  </ListItem>
                )}
              </List>
            )}
          </AccordionDetails>
        </Accordion>
      </Box>
    </Modal>
  );
};
export default BookingFormModal;
