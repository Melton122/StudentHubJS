import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const TutorCard = ({ tutor, onPress }) => {
  const renderStars = (rating = 0) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < Math.floor(rating)) {
        stars.push(<Ionicons key={i} name="star" size={12} color="#FDCB6E" />);
      } else if (i === Math.floor(rating) && rating % 1 >= 0.5) {
        stars.push(<Ionicons key={i} name="star-half" size={12} color="#FDCB6E" />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={12} color="#FDCB6E" />);
      }
    }
    return stars;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(tutor)} activeOpacity={0.8}>
      <LinearGradient colors={['#1E2340', '#2D3561']} style={styles.gradient}>
        <View style={styles.imageContainer}>
          {tutor.profile_image_url ? (
            <Image source={{ uri: tutor.profile_image_url }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>{tutor.name?.charAt(0) || 'T'}</Text>
            </View>
          )}
          {tutor.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#00B894" />
            </View>
          )}
        </View>

        <Text style={styles.name} numberOfLines={1}>{tutor.name}</Text>

        <View style={styles.ratingContainer}>
          {renderStars(tutor.rating || 0)}
          <Text style={styles.ratingText}>{tutor.rating?.toFixed(1) || '0.0'}</Text>
        </View>

        <Text style={styles.subjects} numberOfLines={1}>
          {tutor.subjects?.join(', ') || 'General'}
        </Text>

        <Text style={styles.rate}>R{tutor.hourly_rate || 200}/hr</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 160,
    marginRight: 15,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#6C5CE7',
  },
  placeholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  placeholderText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E2340',
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#FDCB6E',
    fontWeight: '600',
    marginLeft: 4,
  },
  subjects: {
    fontSize: 12,
    color: '#A29BFE',
    marginBottom: 8,
    textAlign: 'center',
  },
  rate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00B894',
  },
});