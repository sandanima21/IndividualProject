import React, { useState } from 'react';
import ExploreMenu from '../../components/ExploreMenu/ExploreMenu';
import FoodDisplay from '../../components/FoodDisplay/FoodDisplay';

const Explore = () => {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  return (
    <div className="container py-5">
      <ExploreMenu category={category} setCategory={setCategory} searchText={search} setSearchText={setSearch} />
      <FoodDisplay category={category} searchText={search} />
    </div>
  );
};

export default Explore;
