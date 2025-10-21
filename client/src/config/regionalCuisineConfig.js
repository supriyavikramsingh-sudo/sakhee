// client/src/config/regionalCuisineConfig.js

/**
 * Region-to-State-to-Cuisine Mapping for India
 * Used in both onboarding and meal plan generation
 */
export const regionalCuisineConfig = {
  regions: [
    {
      id: 'north-indian',
      label: 'North Indian',
      states: [
        { id: 'uttar-pradesh', label: 'Uttar Pradesh', cuisine: 'Uttar Pradesh' },
        { id: 'uttarakhand', label: 'Uttarakhand', cuisine: 'Uttarakhand' },
        { id: 'himachal-pradesh', label: 'Himachal Pradesh', cuisine: 'Himachal Pradesh' },
        { id: 'rajasthan', label: 'Rajasthan', cuisine: 'Rajasthani' },
        { id: 'haryana', label: 'Haryana', cuisine: 'Haryanvi' },
        { id: 'bihar', label: 'Bihar', cuisine: 'Bihari' },
        { id: 'punjab', label: 'Punjab', cuisine: 'Punjabi' },
        { id: 'delhi', label: 'Delhi', cuisine: 'Delhi' },
      ],
    },
    {
      id: 'central-indian',
      label: 'Central Indian',
      states: [
        { id: 'madhya-pradesh', label: 'Madhya Pradesh', cuisine: 'Madhya Pradesh' },
        { id: 'chhattisgarh', label: 'Chhattisgarh', cuisine: 'Chhattisgarh' },
      ],
    },
    {
      id: 'west-indian',
      label: 'West Indian',
      states: [
        { id: 'gujarat', label: 'Gujarat', cuisine: 'Gujarati' },
        { id: 'maharashtra', label: 'Maharashtra', cuisine: 'Maharashtrian' },
        { id: 'goa', label: 'Goa', cuisine: 'Goan' },
      ],
    },
    {
      id: 'south-indian',
      label: 'South Indian',
      states: [
        { id: 'kerala', label: 'Kerala', cuisine: 'Kerala' },
        { id: 'tamil-nadu', label: 'Tamil Nadu', cuisine: 'Tamil' },
        { id: 'karnataka', label: 'Karnataka', cuisine: 'Karnataka' },
        { id: 'telangana', label: 'Telangana', cuisine: 'Telangana' },
        { id: 'andhra-pradesh', label: 'Andhra Pradesh', cuisine: 'Andhra' },
        { id: 'puducherry', label: 'Puducherry', cuisine: 'Puducherry' },
        { id: 'lakshadweep', label: 'Lakshadweep', cuisine: 'Lakshadweep' },
      ],
    },
    {
      id: 'east-indian',
      label: 'East Indian',
      states: [
        { id: 'west-bengal', label: 'West Bengal', cuisine: 'Bengali' },
        { id: 'jharkhand', label: 'Jharkhand', cuisine: 'Jharkhandi' },
        { id: 'odisha', label: 'Odisha', cuisine: 'Odia' },
        { id: 'assam', label: 'Assam', cuisine: 'Assamese' },
        { id: 'sikkim', label: 'Sikkim', cuisine: 'Sikkimese' },
        { id: 'manipur', label: 'Manipur', cuisine: 'Manipuri' },
        { id: 'meghalaya', label: 'Meghalaya', cuisine: 'Meghalayan' },
        { id: 'mizoram', label: 'Mizoram', cuisine: 'Mizo' },
        { id: 'nagaland', label: 'Nagaland', cuisine: 'Naga' },
        { id: 'tripura', label: 'Tripura', cuisine: 'Tripuri' },
        { id: 'arunachal-pradesh', label: 'Arunachal Pradesh', cuisine: 'Arunachali' },
      ],
    },
  ],

  /**
   * Get all states for selected regions
   * @param {string[]} selectedRegionIds - Array of region IDs
   * @returns {object[]} Array of state objects
   */
  getStatesForRegions(selectedRegionIds) {
    if (!selectedRegionIds || selectedRegionIds.length === 0) {
      return [];
    }

    return this.regions
      .filter((region) => selectedRegionIds.includes(region.id))
      .flatMap((region) => region.states);
  },

  /**
   * Get cuisines from selected state IDs
   * @param {string[]} selectedStateIds - Array of state IDs
   * @returns {string[]} Array of cuisine names
   */
  getCuisinesFromStates(selectedStateIds) {
    if (!selectedStateIds || selectedStateIds.length === 0) {
      return [];
    }

    const cuisines = [];
    this.regions.forEach((region) => {
      region.states.forEach((state) => {
        if (selectedStateIds.includes(state.id)) {
          cuisines.push(state.cuisine);
        }
      });
    });

    return cuisines;
  },

  /**
   * Get region ID from state ID
   * @param {string} stateId - State ID
   * @returns {string|null} Region ID
   */
  getRegionFromState(stateId) {
    for (const region of this.regions) {
      if (region.states.some((state) => state.id === stateId)) {
        return region.id;
      }
    }
    return null;
  },

  /**
   * Get all region IDs from state IDs
   * @param {string[]} stateIds - Array of state IDs
   * @returns {string[]} Array of unique region IDs
   */
  getRegionsFromStates(stateIds) {
    if (!stateIds || stateIds.length === 0) {
      return [];
    }

    const regionIds = new Set();
    stateIds.forEach((stateId) => {
      const regionId = this.getRegionFromState(stateId);
      if (regionId) {
        regionIds.add(regionId);
      }
    });

    return Array.from(regionIds);
  },
};

export default regionalCuisineConfig;
