interface LocationData {
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

interface JoinCommunityData {
  email: string;
  location: LocationData;
  deviceType: string;
  consentGiven: boolean;
}

interface JoinCommunityResponse {
  success: boolean;
  message: string;
  data?: { rowNumber: number };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const joinCommunity = async (data: JoinCommunityData): Promise<JoinCommunityResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/community/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to join community');
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred. Please try again.');
  }
};
