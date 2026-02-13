import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const ResourceCard = ({ resource, onPress }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'book': return 'book';
      case 'past_paper': return 'document-text';
      case 'notes': return 'clipboard';
      case 'video': return 'play-circle';
      case 'worksheet': return 'document-attach';
      default: return 'document';
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'book': return '#6C5CE7';
      case 'past_paper': return '#FD79A8';
      case 'notes': return '#00B894';
      case 'video': return '#E17055';
      case 'worksheet': return '#74B9FF';
      default: return '#74B9FF';
    }
  };

  const iconName = getIcon(resource.resource_type);
  const color = getColor(resource.resource_type);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(resource)} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={iconName} size={24} color={color} />
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{resource.title}</Text>
        {resource.description && (
          <Text style={styles.description} numberOfLines={1}>{resource.description}</Text>
        )}
        <View style={styles.meta}>
          <View style={[styles.typeBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.typeText, { color }]}>
              {resource.resource_type?.replace('_', ' ') || 'resource'}
            </Text>
          </View>
          {resource.year && (
            <View style={styles.yearBadge}>
              <Text style={styles.yearText}>{resource.year}</Text>
            </View>
          )}
          <View style={styles.downloads}>
            <Ionicons name="download-outline" size={12} color="#636E72" />
            <Text style={styles.downloadCount}>{resource.download_count || 0}</Text>
          </View>
        </View>
      </View>

      <Ionicons name="download" size={24} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2340',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#A29BFE',
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  yearBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FDCB6E',
  },
  yearText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A0E27',
  },
  downloads: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  downloadCount: {
    fontSize: 11,
    color: '#636E72',
  },
});