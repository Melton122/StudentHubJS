import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Image, ActivityIndicator, Modal,
  FlatList, RefreshControl, Dimensions, Switch, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../services/supabaseConfig';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// ==============================================
// ========== MASTER ADMIN EMAIL ===============
// ==============================================
const MASTER_EMAIL = 'meltonhlungwani970@gmail.com';

export default function AdminPanel({ navigation }) {
  const { user, profile } = useAuth();

  // ========== STATE ==========
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTutors: 0,
    activeSessions: 0,
    revenue: 0,
    pendingRequests: 0,
  });

  // Lists
  const [recentActivities, setRecentActivities] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allTutors, setAllTutors] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allResources, setAllResources] = useState([]);
  const [allAnnouncements, setAllAnnouncements] = useState([]);

  // Modals visibility
  const [showAddTutorModal, setShowAddTutorModal] = useState(false);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  // ----- New Tutor Form -----
  const [newTutor, setNewTutor] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    subjects: [],
    hourly_rate: '',
    bio: '',
    qualifications: '',
    experience_years: '',
  });

  // ----- New Resource Form -----
  const [newResource, setNewResource] = useState({
    title: '',
    subject_id: '',
    type: 'notes',
    description: '',
    file_url: '',
    year: new Date().getFullYear(),
  });

  // ----- New Announcement Form -----
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    priority: 'normal',
    is_active: true,
  });

  // ========== ACCESS CONTROL ==========
  useEffect(() => {
    if (user?.email !== MASTER_EMAIL || !profile?.is_admin) {
      Alert.alert('Access Denied', 'Admin access only', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      return;
    }
    fetchAdminData();
  }, []);

  // ========== FETCH ALL ADMIN DATA ==========
  const fetchAdminData = async () => {
    try {
      setLoading(true);

      // 1. Fetch counts (stats)
      const [
        studentsRes,
        tutorsRes,
        sessionsRes,
        requestsRes,
        bookingsRes,
        activitiesRes,
        subjectsRes,
        allTutorsRes,
        allStudentsRes,
        resourcesRes,
        announcementsRes,
      ] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('tutors').select('id', { count: 'exact', head: true }),
        supabase.from('tutor_sessions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tutor_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('tutor_bookings').select('amount').eq('status', 'completed'),
        supabase.from('admin_activities').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('tutors').select('*, subjects(name)').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('*, users(email)').eq('role', 'student').order('created_at', { ascending: false }),
        supabase.from('resources').select('*').order('created_at', { ascending: false }),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      ]);

      // Calculate revenue (20% commission)
      const revenue = bookingsRes.data?.reduce((sum, b) => sum + (b.amount * 0.2), 0) || 0;

      setStats({
        totalStudents: studentsRes.count || 0,
        totalTutors: tutorsRes.count || 0,
        activeSessions: sessionsRes.count || 0,
        revenue: Math.round(revenue),
        pendingRequests: requestsRes.count || 0,
      });

      setRecentActivities(activitiesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setAllTutors(allTutorsRes.data || []);
      setAllStudents(allStudentsRes.data || []);
      setAllResources(resourcesRes.data || []);
      setAllAnnouncements(announcementsRes.data || []);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      Alert.alert('Error', 'Failed to load admin data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  // ========== ADD TUTOR (EDGE FUNCTION) ==========
  const handleAddTutor = async () => {
    if (!newTutor.name || !newTutor.email || !newTutor.phone || !newTutor.subjects.length) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-tutor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...newTutor,
            password: 'TempPassword123!', // will be changed on first login
            admin_id: user.id,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      Alert.alert('Success', 'Tutor added successfully!');
      setShowAddTutorModal(false);
      resetTutorForm();
      fetchAdminData();

    } catch (error) {
      console.error('Error adding tutor:', error);
      Alert.alert('Error', error.message || 'Failed to add tutor');
    } finally {
      setLoading(false);
    }
  };

  const resetTutorForm = () => {
    setNewTutor({
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      subjects: [],
      hourly_rate: '',
      bio: '',
      qualifications: '',
      experience_years: '',
    });
  };

  // ========== ADD RESOURCE (WITH STORAGE UPLOAD) ==========
  const handleAddResource = async () => {
    if (!newResource.title || !newResource.subject_id || !newResource.file_url) {
      Alert.alert('Validation Error', 'Please fill in all required fields and upload a file');
      return;
    }

    try {
      setLoading(true);

      // 1. Upload file to Supabase Storage
      const fileName = `resources/${Date.now()}_${newResource.file_url.split('/').pop()}`;
      const formData = new FormData();
      formData.append('file', {
        uri: newResource.file_url,
        name: fileName,
        type: 'application/octet-stream', // you can improve MIME detection if needed
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resources')
        .upload(fileName, formData, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(fileName);

      // 3. Insert resource record
      const { error: insertError } = await supabase.from('resources').insert([{
        title: newResource.title,
        subject_id: newResource.subject_id,
        resource_type: newResource.type,
        description: newResource.description,
        file_url: publicUrl,
        year: newResource.year,
        uploaded_by: user.id,
        download_count: 0,
        is_published: true,
      }]);

      if (insertError) throw insertError;

      // 4. Log activity
      await supabase.from('admin_activities').insert([{
        admin_id: user.id,
        action: 'added_resource',
        details: `Added resource: ${newResource.title}`,
        created_at: new Date().toISOString(),
      }]);

      Alert.alert('Success', 'Resource added successfully!');
      setShowAddResourceModal(false);
      resetResourceForm();
      fetchAdminData();

    } catch (error) {
      console.error('Error adding resource:', error);
      Alert.alert('Error', error.message || 'Failed to add resource');
    } finally {
      setLoading(false);
    }
  };

  const resetResourceForm = () => {
    setNewResource({
      title: '',
      subject_id: '',
      type: 'notes',
      description: '',
      file_url: '',
      year: new Date().getFullYear(),
    });
  };

  // ========== ADD ANNOUNCEMENT ==========
  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.message) {
      Alert.alert('Validation Error', 'Please fill in title and message');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from('announcements').insert([{
        title: newAnnouncement.title,
        message: newAnnouncement.message,
        priority: newAnnouncement.priority,
        is_active: newAnnouncement.is_active,
        created_by: user.id,
        created_at: new Date().toISOString(),
      }]);

      if (error) throw error;

      await supabase.from('admin_activities').insert([{
        admin_id: user.id,
        action: 'added_announcement',
        details: `Added announcement: ${newAnnouncement.title}`,
        created_at: new Date().toISOString(),
      }]);

      Alert.alert('Success', 'Announcement published!');
      setShowAnnouncementModal(false);
      resetAnnouncementForm();
      fetchAdminData();

    } catch (error) {
      console.error('Error adding announcement:', error);
      Alert.alert('Error', error.message || 'Failed to add announcement');
    } finally {
      setLoading(false);
    }
  };

  const resetAnnouncementForm = () => {
    setNewAnnouncement({
      title: '',
      message: '',
      priority: 'normal',
      is_active: true,
    });
  };

  // ========== FILE PICKER ==========
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.type === 'success') {
        setNewResource(prev => ({ ...prev, file_url: result.uri }));
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  // ========== TOGGLE TUTOR STATUS ==========
  const toggleTutorStatus = async (tutorId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('tutors')
        .update({ status: newStatus })
        .eq('id', tutorId);
      if (error) throw error;
      Alert.alert('Success', `Tutor ${newStatus}d successfully`);
      fetchAdminData();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // ========== DELETE ITEM ==========
  const deleteItem = async (table, id, itemName = 'Item') => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete this ${itemName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from(table).delete().eq('id', id);
              if (error) throw error;
              Alert.alert('Deleted', `${itemName} successfully deleted`);
              fetchAdminData();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  // ========== RENDER FUNCTIONS ==========
  const renderTutorItem = ({ item }) => (
    <View style={styles.tutorItem}>
      <View style={styles.tutorInfo}>
        <Text style={styles.tutorName}>{item.name}</Text>
        <Text style={styles.tutorEmail}>{item.email}</Text>
        <View style={styles.tutorSubjects}>
          {item.subjects?.slice(0, 2).map((subject, idx) => (
            <View key={idx} style={styles.subjectTag}>
              <Text style={styles.subjectTagText}>{subject.name}</Text>
            </View>
          ))}
          {item.subjects?.length > 2 && (
            <Text style={styles.moreSubjects}>+{item.subjects.length - 2}</Text>
          )}
        </View>
      </View>
      <View style={styles.tutorActions}>
        <TouchableOpacity
          style={[styles.statusButton, item.status === 'active' ? styles.activeButton : styles.inactiveButton]}
          onPress={() => toggleTutorStatus(item.id, item.status)}
        >
          <Text style={styles.statusButtonText}>
            {item.status === 'active' ? 'Active' : 'Inactive'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.tutorRate}>R{item.hourly_rate}/hr</Text>
        <TouchableOpacity onPress={() => deleteItem('tutors', item.id, 'Tutor')} style={styles.deleteIcon}>
          <Ionicons name="trash-outline" size={18} color="#FF7675" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStudentItem = ({ item }) => (
    <View style={styles.studentItem}>
      <View style={styles.studentAvatar}>
        <Text style={styles.studentAvatarText}>
          {item.full_name?.charAt(0)?.toUpperCase() || 'S'}
        </Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.full_name || 'Student'}</Text>
        <Text style={styles.studentEmail}>{item.users?.email}</Text>
        <Text style={styles.studentGrade}>
          {item.grade_level} • {item.school_name}
        </Text>
      </View>
      <TouchableOpacity style={styles.viewButton}>
        <Ionicons name="eye-outline" size={20} color="#6C5CE7" />
      </TouchableOpacity>
    </View>
  );

  const renderResourceItem = ({ item }) => (
    <View style={styles.resourceItem}>
      <View style={styles.resourceInfo}>
        <Text style={styles.resourceTitle}>{item.title}</Text>
        <Text style={styles.resourceMeta}>
          {subjects.find(s => s.id === item.subject_id)?.name || 'Unknown'} • {item.download_count || 0} downloads
        </Text>
      </View>
      <TouchableOpacity onPress={() => deleteItem('resources', item.id, 'Resource')} style={styles.deleteIcon}>
        <Ionicons name="trash-outline" size={18} color="#FF7675" />
      </TouchableOpacity>
    </View>
  );

  const renderAnnouncementItem = ({ item }) => (
    <View style={styles.announcementItemList}>
      <View style={styles.announcementInfo}>
        <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(item.priority) }]} />
        <View style={styles.announcementTextContainer}>
          <Text style={styles.announcementTitle}>{item.title}</Text>
          <Text style={styles.announcementMessage} numberOfLines={1}>{item.message}</Text>
          <Text style={styles.announcementMeta}>
            {new Date(item.created_at).toLocaleDateString()} • {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => deleteItem('announcements', item.id, 'Announcement')} style={styles.deleteIcon}>
        <Ionicons name="trash-outline" size={18} color="#FF7675" />
      </TouchableOpacity>
    </View>
  );

  // ========== UI COMPONENTS ==========
  const AdminStats = () => (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <Ionicons name="people" size={24} color="#6C5CE7" />
        <Text style={styles.statNumber}>{stats.totalStudents}</Text>
        <Text style={styles.statLabel}>Students</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="school" size={24} color="#00B894" />
        <Text style={styles.statNumber}>{stats.totalTutors}</Text>
        <Text style={styles.statLabel}>Tutors</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="calendar" size={24} color="#FD79A8" />
        <Text style={styles.statNumber}>{stats.activeSessions}</Text>
        <Text style={styles.statLabel}>Sessions</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="cash" size={24} color="#FDCB6E" />
        <Text style={styles.statNumber}>R{stats.revenue}</Text>
        <Text style={styles.statLabel}>Revenue</Text>
      </View>
    </View>
  );

  const QuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity style={styles.quickAction} onPress={() => setShowAddTutorModal(true)}>
        <View style={[styles.quickActionIcon, { backgroundColor: '#6C5CE720' }]}>
          <Ionicons name="person-add" size={24} color="#6C5CE7" />
        </View>
        <Text style={styles.quickActionText}>Add Tutor</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickAction} onPress={() => setShowAddResourceModal(true)}>
        <View style={[styles.quickActionIcon, { backgroundColor: '#00B89420' }]}>
          <Ionicons name="document-attach" size={24} color="#00B894" />
        </View>
        <Text style={styles.quickActionText}>Add Resource</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickAction} onPress={() => setShowAnnouncementModal(true)}>
        <View style={[styles.quickActionIcon, { backgroundColor: '#FDCB6E20' }]}>
          <Ionicons name="megaphone" size={24} color="#FDCB6E" />
        </View>
        <Text style={styles.quickActionText}>Announce</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickAction} onPress={() => setSelectedTab('reports')}>
        <View style={[styles.quickActionIcon, { backgroundColor: '#FD79A820' }]}>
          <Ionicons name="stats-chart" size={24} color="#FD79A8" />
        </View>
        <Text style={styles.quickActionText}>Reports</Text>
      </TouchableOpacity>
    </View>
  );

  // ========== HELPER FUNCTIONS ==========
  const getActivityIcon = (action) => {
    switch (action) {
      case 'added_tutor': return 'person-add';
      case 'added_resource': return 'document-attach';
      case 'added_announcement': return 'megaphone';
      case 'updated_settings': return 'settings';
      default: return 'checkmark-circle';
    }
  };

  const getActivityColor = (action) => {
    switch (action) {
      case 'added_tutor': return '#6C5CE7';
      case 'added_resource': return '#00B894';
      case 'added_announcement': return '#FDCB6E';
      case 'updated_settings': return '#FD79A8';
      default: return '#74B9FF';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return '#74B9FF';
      case 'normal': return '#FDCB6E';
      case 'high': return '#FF7675';
      case 'urgent': return '#D63031';
      default: return '#636E72';
    }
  };

  // ========== MODAL COMPONENTS ==========
  const AddTutorModal = () => (
    <Modal
      visible={showAddTutorModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowAddTutorModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient colors={['#1E2340', '#0A0E27']} style={styles.modalGradient}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Tutor</Text>
              <TouchableOpacity onPress={() => setShowAddTutorModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Full Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Tutor's full name"
                placeholderTextColor="#636E72"
                value={newTutor.name}
                onChangeText={(t) => setNewTutor(prev => ({ ...prev, name: t }))}
              />
              <Text style={styles.formLabel}>Email *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="tutor@email.com"
                placeholderTextColor="#636E72"
                value={newTutor.email}
                onChangeText={(t) => setNewTutor(prev => ({ ...prev, email: t }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.formLabel}>Phone *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="+27 XXX XXX XXXX"
                placeholderTextColor="#636E72"
                value={newTutor.phone}
                onChangeText={(t) => setNewTutor(prev => ({ ...prev, phone: t }))}
                keyboardType="phone-pad"
              />
              <Text style={styles.formLabel}>WhatsApp (Optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="+27 XXX XXX XXXX"
                placeholderTextColor="#636E72"
                value={newTutor.whatsapp}
                onChangeText={(t) => setNewTutor(prev => ({ ...prev, whatsapp: t }))}
                keyboardType="phone-pad"
              />
              <Text style={styles.formLabel}>Subjects *</Text>
              <View style={styles.subjectsGrid}>
                {subjects.map((subject) => {
                  const isSelected = newTutor.subjects.includes(subject.id);
                  return (
                    <TouchableOpacity
                      key={subject.id}
                      style={[styles.subjectChip, isSelected && styles.subjectChipActive]}
                      onPress={() => {
                        setNewTutor((prev) => ({
                          ...prev,
                          subjects: isSelected
                            ? prev.subjects.filter((id) => id !== subject.id)
                            : [...prev.subjects, subject.id],
                        }));
                      }}
                    >
                      <Text style={[styles.subjectChipText, isSelected && styles.subjectChipTextActive]}>
                        {subject.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.formLabel}>Hourly Rate (R)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="200"
                placeholderTextColor="#636E72"
                value={newTutor.hourly_rate}
                onChangeText={(t) => setNewTutor(prev => ({ ...prev, hourly_rate: t }))}
                keyboardType="numeric"
              />
              <Text style={styles.formLabel}>Experience (Years)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="2"
                placeholderTextColor="#636E72"
                value={newTutor.experience_years}
                onChangeText={(t) => setNewTutor(prev => ({ ...prev, experience_years: t }))}
                keyboardType="numeric"
              />
              <Text style={styles.formLabel}>Qualifications</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Degrees, certifications, etc."
                placeholderTextColor="#636E72"
                value={newTutor.qualifications}
                onChangeText={(t) => setNewTutor(prev => ({ ...prev, qualifications: t }))}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.formLabel}>Bio</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Brief introduction about the tutor..."
                placeholderTextColor="#636E72"
                value={newTutor.bio}
                onChangeText={(t) => setNewTutor(prev => ({ ...prev, bio: t }))}
                multiline
                numberOfLines={4}
              />
              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleAddTutor}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Add Tutor</Text>}
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );

  const AddResourceModal = () => (
    <Modal
      visible={showAddResourceModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowAddResourceModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient colors={['#1E2340', '#0A0E27']} style={styles.modalGradient}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Resource</Text>
              <TouchableOpacity onPress={() => setShowAddResourceModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Title *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Resource title"
                placeholderTextColor="#636E72"
                value={newResource.title}
                onChangeText={(t) => setNewResource(prev => ({ ...prev, title: t }))}
              />
              <Text style={styles.formLabel}>Subject *</Text>
              <View style={styles.subjectsGrid}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject.id}
                    style={[
                      styles.subjectChip,
                      newResource.subject_id === subject.id && styles.subjectChipActive,
                    ]}
                    onPress={() => setNewResource((prev) => ({ ...prev, subject_id: subject.id }))}
                  >
                    <Text
                      style={[
                        styles.subjectChipText,
                        newResource.subject_id === subject.id && styles.subjectChipTextActive,
                      ]}
                    >
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formLabel}>Type</Text>
              <View style={styles.typeButtons}>
                {['notes', 'past_paper', 'textbook', 'video', 'other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      newResource.type === type && styles.typeButtonActive,
                    ]}
                    onPress={() => setNewResource((prev) => ({ ...prev, type }))}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        newResource.type === type && styles.typeButtonTextActive,
                      ]}
                    >
                      {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formLabel}>Year</Text>
              <TextInput
                style={styles.formInput}
                placeholder="2024"
                placeholderTextColor="#636E72"
                value={newResource.year.toString()}
                onChangeText={(t) =>
                  setNewResource((prev) => ({ ...prev, year: parseInt(t) || 2024 }))
                }
                keyboardType="numeric"
              />
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Resource description..."
                placeholderTextColor="#636E72"
                value={newResource.description}
                onChangeText={(t) => setNewResource((prev) => ({ ...prev, description: t }))}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.formLabel}>Upload File *</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
                <Ionicons name="cloud-upload" size={24} color="#6C5CE7" />
                <Text style={styles.uploadButtonText}>
                  {newResource.file_url ? 'File Selected' : 'Choose File'}
                </Text>
              </TouchableOpacity>
              {newResource.file_url && (
                <Text style={styles.fileName} numberOfLines={1}>
                  {newResource.file_url.split('/').pop()}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.saveButton, (loading || !newResource.file_url) && styles.saveButtonDisabled]}
                onPress={handleAddResource}
                disabled={loading || !newResource.file_url}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Upload Resource</Text>}
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );

  const AddAnnouncementModal = () => (
    <Modal
      visible={showAnnouncementModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowAnnouncementModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient colors={['#1E2340', '#0A0E27']} style={styles.modalGradient}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Announcement</Text>
              <TouchableOpacity onPress={() => setShowAnnouncementModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Title *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Announcement title"
                placeholderTextColor="#636E72"
                value={newAnnouncement.title}
                onChangeText={(t) => setNewAnnouncement((prev) => ({ ...prev, title: t }))}
              />
              <Text style={styles.formLabel}>Priority</Text>
              <View style={styles.priorityButtons}>
                {['low', 'normal', 'high', 'urgent'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      newAnnouncement.priority === priority && styles.priorityButtonActive,
                    ]}
                    onPress={() => setNewAnnouncement((prev) => ({ ...prev, priority }))}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        newAnnouncement.priority === priority && styles.priorityButtonTextActive,
                      ]}
                    >
                      {priority.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formLabel}>Message *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Announcement message..."
                placeholderTextColor="#636E72"
                value={newAnnouncement.message}
                onChangeText={(t) => setNewAnnouncement((prev) => ({ ...prev, message: t }))}
                multiline
                numberOfLines={6}
              />
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Active</Text>
                <Switch
                  value={newAnnouncement.is_active}
                  onValueChange={(v) => setNewAnnouncement((prev) => ({ ...prev, is_active: v }))}
                  trackColor={{ false: '#2D3561', true: '#6C5CE7' }}
                  thumbColor="#FFF"
                />
              </View>
              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleAddAnnouncement}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Publish Announcement</Text>}
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );

  // ========== LOADING ==========
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.loadingGradient}>
          <Ionicons name="school" size={60} color="#FFF" />
          <Text style={styles.loadingText}>Loading Admin Dashboard...</Text>
        </LinearGradient>
      </View>
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <View style={styles.container}>
      <AddTutorModal />
      <AddResourceModal />
      <AddAnnouncementModal />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={['#1E2340', '#6C5CE7']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <Text style={styles.headerSubtitle}>Welcome back, {profile?.full_name || 'Admin'}</Text>
            </View>
            <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats Overview */}
        <AdminStats />

        {/* Quick Actions */}
        <QuickActions />

        {/* Tab Navigation */}
        <View style={styles.tabs}>
          {['overview', 'tutors', 'resources', 'students', 'announcements'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {/* ----- OVERVIEW TAB ----- */}
          {selectedTab === 'overview' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activities</Text>
              </View>
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, idx) => (
                  <View key={idx} style={styles.activityItem}>
                    <Ionicons
                      name={getActivityIcon(activity.action)}
                      size={20}
                      color={getActivityColor(activity.action)}
                    />
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityText}>{activity.details}</Text>
                      <Text style={styles.activityDate}>
                        {new Date(activity.created_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No recent activities</Text>
              )}

              {/* Pending Requests Banner */}
              {stats.pendingRequests > 0 && (
                <TouchableOpacity style={styles.pendingRequestsCard}>
                  <View style={styles.pendingRequestsHeader}>
                    <Ionicons name="alert-circle" size={24} color="#FF7675" />
                    <Text style={styles.pendingRequestsTitle}>
                      {stats.pendingRequests} Pending {stats.pendingRequests === 1 ? 'Request' : 'Requests'}
                    </Text>
                  </View>
                  <Text style={styles.pendingRequestsText}>Tutor requests need your attention</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ----- TUTORS TAB ----- */}
          {selectedTab === 'tutors' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Tutors ({allTutors.length})</Text>
                <TouchableOpacity onPress={() => setShowAddTutorModal(true)}>
                  <Text style={styles.addButtonText}>+ Add New</Text>
                </TouchableOpacity>
              </View>
              {allTutors.length > 0 ? (
                <FlatList
                  data={allTutors}
                  renderItem={renderTutorItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.emptyText}>No tutors registered yet</Text>
              )}
            </>
          )}

          {/* ----- RESOURCES TAB ----- */}
          {selectedTab === 'resources' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Resources ({allResources.length})</Text>
                <TouchableOpacity onPress={() => setShowAddResourceModal(true)}>
                  <Text style={styles.addButtonText}>+ Add New</Text>
                </TouchableOpacity>
              </View>
              {allResources.length > 0 ? (
                <FlatList
                  data={allResources}
                  renderItem={renderResourceItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.emptyText}>No resources uploaded yet</Text>
              )}
            </>
          )}

          {/* ----- STUDENTS TAB ----- */}
          {selectedTab === 'students' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Students ({allStudents.length})</Text>
              </View>
              {allStudents.length > 0 ? (
                <FlatList
                  data={allStudents}
                  renderItem={renderStudentItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.emptyText}>No students registered yet</Text>
              )}
            </>
          )}

          {/* ----- ANNOUNCEMENTS TAB ----- */}
          {selectedTab === 'announcements' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Announcements ({allAnnouncements.length})</Text>
                <TouchableOpacity onPress={() => setShowAnnouncementModal(true)}>
                  <Text style={styles.addButtonText}>+ Add New</Text>
                </TouchableOpacity>
              </View>
              {allAnnouncements.length > 0 ? (
                <FlatList
                  data={allAnnouncements}
                  renderItem={renderAnnouncementItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.emptyText}>No announcements yet</Text>
              )}
            </>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ==============================================
// ========== STYLES ============================
// ==============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A29BFE',
  },
  settingsButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: -15,
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1E2340',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#636E72',
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#1E2340',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 8,
    flexWrap: 'wrap',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1E2340',
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  tabActive: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
  },
  tabTextActive: {
    color: '#FFF',
  },
  tabContent: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  addButtonText: {
    fontSize: 14,
    color: '#6C5CE7',
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#1E2340',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  activityInfo: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#A29BFE',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: '#636E72',
  },
  tutorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E2340',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  tutorInfo: {
    flex: 1,
  },
  tutorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  tutorEmail: {
    fontSize: 13,
    color: '#A29BFE',
    marginBottom: 8,
  },
  tutorSubjects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  subjectTag: {
    backgroundColor: '#2D3561',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subjectTagText: {
    fontSize: 11,
    color: '#A29BFE',
  },
  moreSubjects: {
    fontSize: 11,
    color: '#6C5CE7',
    fontWeight: '600',
  },
  tutorActions: {
    alignItems: 'flex-end',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  activeButton: {
    backgroundColor: '#00B89420',
  },
  inactiveButton: {
    backgroundColor: '#FF767520',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00B894',
  },
  tutorRate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00B894',
    marginBottom: 8,
  },
  deleteIcon: {
    padding: 4,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2340',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 13,
    color: '#A29BFE',
    marginBottom: 4,
  },
  studentGrade: {
    fontSize: 12,
    color: '#636E72',
  },
  viewButton: {
    padding: 8,
  },
  resourceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E2340',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  resourceMeta: {
    fontSize: 12,
    color: '#A29BFE',
  },
  announcementItemList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E2340',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  announcementInfo: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  priorityIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  announcementTextContainer: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  announcementMessage: {
    fontSize: 13,
    color: '#A29BFE',
    marginBottom: 4,
  },
  announcementMeta: {
    fontSize: 11,
    color: '#636E72',
  },
  pendingRequestsCard: {
    backgroundColor: '#FF767520',
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF7675',
  },
  pendingRequestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  pendingRequestsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF7675',
  },
  pendingRequestsText: {
    fontSize: 14,
    color: '#FFF',
  },
  emptyText: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    marginTop: 20,
  },
  bottomSpacer: {
    height: 100,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalGradient: {
    paddingTop: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3561',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  modalBody: {
    padding: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A29BFE',
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: '#1E2340',
    borderWidth: 1,
    borderColor: '#2D3561',
    borderRadius: 12,
    padding: 14,
    color: '#FFF',
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectChip: {
    backgroundColor: '#1E2340',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  subjectChipActive: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  subjectChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A29BFE',
  },
  subjectChipTextActive: {
    color: '#FFF',
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1E2340',
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  typeButtonActive: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A29BFE',
    textTransform: 'capitalize',
  },
  typeButtonTextActive: {
    color: '#FFF',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1E2340',
    borderWidth: 2,
    borderColor: '#6C5CE7',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6C5CE7',
  },
  fileName: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 8,
    textAlign: 'center',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E2340',
    borderWidth: 1,
    borderColor: '#2D3561',
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  priorityButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636E72',
  },
  priorityButtonTextActive: {
    color: '#FFF',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  saveButton: {
    backgroundColor: '#6C5CE7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});