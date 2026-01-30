import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, MapPin, Bell, Volume2, Share2, Calendar, AlertCircle, CheckCircle2, LogIn, LogOut, ArrowLeftRight, X, Plus } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addHours } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LocationPicker } from '@/components/location/LocationPicker';
import { useCreateReminder } from '@/hooks/useReminders';
import { useAuthStore } from '@/stores/authStore';

const reminderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  notes: z.string().optional(),
  type: z.enum(['time', 'location']),
  triggerAt: z.string().optional(),
  // Location fields
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationName: z.string().optional(),
  radius: z.number().optional(),
  triggerOn: z.enum(['enter', 'exit', 'both']).optional(),
  // Other fields
  deliveryMethod: z.enum(['notification', 'alarm', 'share']),
  priority: z.enum(['low', 'medium', 'high']),
});

type ReminderFormData = z.infer<typeof reminderSchema>;

export default function CreateReminderScreen() {
  const createReminder = useCreateReminder();
  const { user } = useAuthStore();
  const isPremium = user?.isPremium ?? false;

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(addHours(new Date(), 1));

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      type: 'time',
      deliveryMethod: 'notification',
      priority: 'medium',
      triggerAt: addHours(new Date(), 1).toISOString(),
      triggerOn: 'enter',
      radius: 200,
    },
  });

  const watchType = watch('type');
  const watchDeliveryMethod = watch('deliveryMethod');
  const watchPriority = watch('priority');
  const watchTriggerOn = watch('triggerOn');

  const onSubmit = async (data: ReminderFormData) => {
    try {
      // Validate location data for location-based reminders
      if (data.type === 'location') {
        if (!data.latitude || !data.longitude) {
          Alert.alert('Location Required', 'Please select a location on the map.');
          return;
        }
      }

      await createReminder.mutateAsync({
        title: data.title,
        notes: data.notes,
        type: data.type,
        triggerAt: data.type === 'time' ? data.triggerAt : undefined,
        latitude: data.type === 'location' ? data.latitude : undefined,
        longitude: data.type === 'location' ? data.longitude : undefined,
        locationName: data.type === 'location' ? data.locationName : undefined,
        radius: data.type === 'location' ? data.radius : undefined,
        triggerOn: data.type === 'location' ? data.triggerOn : undefined,
        deliveryMethod: data.deliveryMethod,
        priority: data.priority,
      });
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to create reminder. Please try again.');
      console.error('Create reminder error:', error);
    }
  };

  const handleDateChange = (event: unknown, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      const newDate = new Date(selectedDate);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(newDate);
      setValue('triggerAt', newDate.toISOString());

      if (Platform.OS === 'android') {
        setShowTimePicker(true);
      }
    }
  };

  const handleTimeChange = (event: unknown, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (time) {
      const newDate = new Date(selectedDate);
      newDate.setHours(time.getHours(), time.getMinutes());
      setSelectedDate(newDate);
      setValue('triggerAt', newDate.toISOString());
    }
  };

  const handleLocationSelect = (location: {
    latitude: number;
    longitude: number;
    locationName: string;
    radius: number;
  }) => {
    setValue('latitude', location.latitude);
    setValue('longitude', location.longitude);
    setValue('locationName', location.locationName);
    setValue('radius', location.radius);
  };

  const priorityConfig = {
    low: { color: '#22c55e', label: 'Low', icon: CheckCircle2 },
    medium: { color: '#f59e0b', label: 'Medium', icon: Clock },
    high: { color: '#ef4444', label: 'High', icon: AlertCircle },
  };

  const triggerOnConfig = [
    { value: 'enter', label: 'Arriving', icon: LogIn, description: 'When I arrive' },
    { value: 'exit', label: 'Leaving', icon: LogOut, description: 'When I leave' },
    { value: 'both', label: 'Both', icon: ArrowLeftRight, description: 'Arrive & Leave' },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        {/* Gradient Header */}
        <LinearGradient
          colors={['#0ea5e9', '#0284c7', '#0369a1']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
              activeOpacity={0.7}
            >
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <Plus size={28} color="#ffffff" />
            </View>
            <Text style={styles.headerTitle}>New Reminder</Text>
            <Text style={styles.headerSubtitle}>What do you need to remember?</Text>
          </View>

          {/* Decorative circles */}
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </LinearGradient>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Title Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            What do you want to remember?
          </Text>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputCard}>
                <Input
                  placeholder="Enter reminder title..."
                  value={value}
                  onChangeText={onChange}
                  error={errors.title?.message}
                />
              </View>
            )}
          />
        </View>

        {/* Notes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Notes (optional)
          </Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputCard}>
                <Input
                  placeholder="Add any additional details..."
                  value={value}
                  onChangeText={onChange}
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
                />
              </View>
            )}
          />
        </View>

        {/* Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Reminder Type
          </Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              onPress={() => setValue('type', 'time')}
              style={[
                styles.typeCard,
                watchType === 'time' && styles.typeCardActive,
              ]}
              activeOpacity={0.7}
            >
              <View style={[styles.typeIcon, watchType === 'time' && styles.typeIconActive]}>
                <Clock size={22} color={watchType === 'time' ? '#0ea5e9' : '#64748b'} />
              </View>
              <Text style={[styles.typeLabel, watchType === 'time' && styles.typeLabelActive]}>
                Time Based
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (isPremium) {
                  setValue('type', 'location');
                } else {
                  Alert.alert(
                    'Premium Feature',
                    'Location-based reminders are available with Premium. Would you like to upgrade?',
                    [
                      { text: 'Not Now', style: 'cancel' },
                      { text: 'Upgrade', onPress: () => router.push('/premium') },
                    ]
                  );
                }
              }}
              style={[
                styles.typeCard,
                watchType === 'location' && styles.typeCardActive,
              ]}
              activeOpacity={0.7}
            >
              {!isPremium && (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
              <View style={[styles.typeIcon, watchType === 'location' && styles.typeIconActive]}>
                <MapPin size={22} color={watchType === 'location' ? '#0ea5e9' : '#64748b'} />
              </View>
              <Text style={[styles.typeLabel, watchType === 'location' && styles.typeLabelActive]}>
                Location
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date & Time Picker - Only for time-based */}
        {watchType === 'time' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>When?</Text>
            <View style={styles.dateTimeCard}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.dateTimeRow}
                activeOpacity={0.7}
              >
                <View style={styles.dateTimeContent}>
                  <View style={styles.dateTimeIcon}>
                    <Calendar size={20} color="#0ea5e9" />
                  </View>
                  <View>
                    <Text style={styles.dateTimeLabel}>Date</Text>
                    <Text style={styles.dateTimeValue}>
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.changeButton}>Change</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                style={styles.dateTimeRow}
                activeOpacity={0.7}
              >
                <View style={styles.dateTimeContent}>
                  <View style={styles.dateTimeIcon}>
                    <Clock size={20} color="#0ea5e9" />
                  </View>
                  <View>
                    <Text style={styles.dateTimeLabel}>Time</Text>
                    <Text style={styles.dateTimeValue}>
                      {format(selectedDate, 'h:mm a')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.changeButton}>Change</Text>
              </TouchableOpacity>

              {/* iOS Date Picker */}
              {Platform.OS === 'ios' && (
                <View style={styles.iosPickerContainer}>
                  <DateTimePicker
                    value={selectedDate}
                    mode="datetime"
                    display="spinner"
                    themeVariant="light"
                    textColor="#000000"
                    onChange={(event, date) => {
                      if (date) {
                        setSelectedDate(date);
                        setValue('triggerAt', date.toISOString());
                      }
                    }}
                    minimumDate={new Date()}
                    style={{ height: 150, backgroundColor: '#ffffff' }}
                  />
                </View>
              )}

              {/* Android Date Picker */}
              {showDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}

              {/* Android Time Picker */}
              {showTimePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                />
              )}
            </View>
          </View>
        )}

        {/* Location Picker - Only for location-based */}
        {watchType === 'location' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Where?</Text>
              <View style={styles.locationCard}>
                <LocationPicker onLocationSelect={handleLocationSelect} />
              </View>
            </View>

            {/* Trigger On Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>When to trigger?</Text>
              <View style={styles.triggerOnRow}>
                {triggerOnConfig.map((option) => {
                  const isSelected = watchTriggerOn === option.value;
                  const Icon = option.icon;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setValue('triggerOn', option.value as 'enter' | 'exit' | 'both')}
                      style={[
                        styles.triggerOnCard,
                        isSelected && styles.triggerOnCardActive,
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.triggerOnIcon, isSelected && styles.triggerOnIconActive]}>
                        <Icon size={20} color={isSelected ? '#0ea5e9' : '#64748b'} />
                      </View>
                      <Text style={[styles.triggerOnLabel, isSelected && styles.triggerOnLabelActive]}>
                        {option.label}
                      </Text>
                      <Text style={styles.triggerOnDescription}>{option.description}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Delivery Method */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>How to notify?</Text>
          <View style={styles.deliveryRow}>
            {[
              { value: 'notification', icon: Bell, label: 'Push', premiumOnly: false, color: '#0ea5e9' },
              { value: 'alarm', icon: Volume2, label: 'Alarm', premiumOnly: true, color: '#8b5cf6' },
              { value: 'share', icon: Share2, label: 'Share', premiumOnly: true, color: '#10b981' },
            ].map((method) => {
              const isLocked = method.premiumOnly && !isPremium;
              const isSelected = watchDeliveryMethod === method.value;

              return (
                <TouchableOpacity
                  key={method.value}
                  onPress={() => {
                    if (isLocked) {
                      Alert.alert(
                        'Premium Feature',
                        'This delivery method is available with Premium.',
                        [
                          { text: 'Not Now', style: 'cancel' },
                          { text: 'Upgrade', onPress: () => router.push('/premium') },
                        ]
                      );
                    } else {
                      setValue('deliveryMethod', method.value as 'notification' | 'alarm' | 'share');
                    }
                  }}
                  style={[
                    styles.deliveryCard,
                    isSelected && { borderColor: '#0ea5e9', backgroundColor: '#f0f9ff' },
                  ]}
                  activeOpacity={0.7}
                >
                  {isLocked && (
                    <View style={styles.deliveryProBadge}>
                      <Text style={styles.deliveryProText}>PRO</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.deliveryIcon,
                      { backgroundColor: isSelected ? `${method.color}15` : '#f1f5f9' },
                    ]}
                  >
                    <method.icon
                      size={22}
                      color={isSelected ? method.color : '#64748b'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.deliveryLabel,
                      { color: isSelected ? method.color : '#64748b' },
                    ]}
                  >
                    {method.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Priority</Text>
          <View style={styles.priorityRow}>
            {(['low', 'medium', 'high'] as const).map((p) => {
              const config = priorityConfig[p];
              const isActive = watchPriority === p;
              const Icon = config.icon;

              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => setValue('priority', p)}
                  style={[
                    styles.priorityCard,
                    isActive && { borderColor: config.color, backgroundColor: `${config.color}10` },
                  ]}
                  activeOpacity={0.7}
                >
                  <Icon size={16} color={isActive ? config.color : '#64748b'} />
                  <Text
                    style={[
                      styles.priorityLabel,
                      { color: isActive ? config.color : '#64748b' },
                    ]}
                  >
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

            {/* Submit Button */}
            <View style={styles.submitSection}>
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={createReminder.isPending}
                size="lg"
                style={styles.submitButton}
              >
                Create Reminder
              </Button>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle1: {
    width: 150,
    height: 150,
    top: -30,
    right: -30,
  },
  decorCircle2: {
    width: 100,
    height: 100,
    bottom: -20,
    left: -20,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
    marginLeft: 4,
  },
  inputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  typeCardActive: {
    borderColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  typeIconActive: {
    backgroundColor: '#e0f2fe',
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  typeLabelActive: {
    color: '#0ea5e9',
  },
  proBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  dateTimeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dateTimeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  changeButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
  iosPickerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
  },
  locationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  triggerOnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  triggerOnCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  triggerOnCardActive: {
    borderColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
  },
  triggerOnIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  triggerOnIconActive: {
    backgroundColor: '#e0f2fe',
  },
  triggerOnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 2,
  },
  triggerOnLabelActive: {
    color: '#0ea5e9',
  },
  triggerOnDescription: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
  deliveryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deliveryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  deliveryProBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deliveryProText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },
  deliveryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  deliveryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  priorityLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitSection: {
    marginTop: 8,
  },
  submitButton: {
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
