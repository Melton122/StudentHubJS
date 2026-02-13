import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabaseConfig';
import * as Linking from 'expo-linking';

export default function DownloadsScreen() {
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDownloads();
  }, []);

  // Fetch logged-in user's downloads
  const fetchDownloads = async () => {
    try {
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;

      if (!user) return;

      const { data, error } = await supabase
        .from('resource_downloads')
        .select(`
          downloaded_at,
          resources (*)
        `)
        .eq('user_id', user.id)
        .order('downloaded_at', { ascending: false });

      if (error) throw error;

      const formatted = data.map(item => ({
        ...item.resources,
        downloaded_at: item.downloaded_at,
      }));

      setDownloads(formatted || []);
    } catch (error) {
      console.error('Error fetching downloads:', error);
      Alert.alert('Error', 'Failed to load downloads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh control
  const onRefresh = () => {
    setRefreshing(true);
    fetchDownloads();
  };

  // Handle resource download
  const handleDownload = async (resource) => {
    try {
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;

      if (!user) {
        Alert.alert('Login required');
        return;
      }

      // Call RPC to log + increment
      const { error: rpcError } = await supabase.rpc('handle_resource_download', {
        resource_id: resource.id,
      });
      if (rpcError) throw rpcError;

      // Get public URL from Supabase Storage
      const { data } = supabase.storage
        .from('resources') // bucket name
        .getPublicUrl(resource.file_path); // column storing file path

      const fileUrl = data.publicUrl;

      if (fileUrl) {
        Linking.openURL(fileUrl);
      }

      Alert.alert('Success', 'Download started');

      // Refresh download list to update counts
      fetchDownloads();
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download file');
    }
  };

  const renderDownloadItem = ({ item }) => (
    <View style={styles.downloadCard}>
      <View style={styles.downloadIcon}>
        <Ionicons name="document-text" size={24} color="#6C5CE7" />
      </View>
      <View style={styles.downloadInfo}>
        <Text style={styles.downloadTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.downloadSubject}>{item.subject}</Text>
        <View style={styles.downloadStats}>
          <Ionicons name="download" size={12} color="#00B894" />
          <Text style={styles.downloadCount}>{item.download_count || 0} downloads</Text>
          <Text style={styles.downloadDate}>
            {item.downloaded_at ? new Date(item.downloaded_at).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={() => handleDownload(item)}
      >
        <Ionicons name="cloud-download" size={20} color="#6C5CE7" />
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Downloads</Text>
        <Text style={styles.headerSubtitle}>
          {downloads.length} downloaded resources
        </Text>
      </View>

      <FlatList
        data={downloads}
        renderItem={renderDownloadItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C5CE7"
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cloud-download" size={60} color="#636E72" />
            <Text style={styles.emptyTitle}>No downloads yet</Text>
            <Text style={styles.emptyText}>
              Download resources will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#1E2340',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
  listContent: {
    padding: 16,
  },
  downloadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2340',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  downloadIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#6C5CE720',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  downloadInfo: {
    flex: 1,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  downloadSubject: {
    fontSize: 13,
    color: '#6C5CE7',
    marginBottom: 8,
  },
  downloadStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadCount: {
    fontSize: 12,
    color: '#00B894',
  },
  downloadDate: {
    fontSize: 11,
    color: '#636E72',
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#2D3561',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
  },
});
