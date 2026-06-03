import React, { useContext } from 'react';
import { StoreContext } from '../../context/StoreContext';
import FoodItem from '../FoodItem/FoodItem';

const FoodDisplay = ({category, searchText}) => {


  const { foodList } = useContext(StoreContext);
  const filteredFoods = foodList.filter(food => ( category === 'All' || food.category === category) && (searchText === '' || food.name.toLowerCase().includes(searchText.toLowerCase())));
  return (
    <div className='container'>
      <div className='row'>
        {filteredFoods.length > 0 ? (
          filteredFoods.map((food, index) => (
            <FoodItem 
              key={index} 
              food={food} 
              index={index} 
            />
          ))
        ) : (
          <div className="col-12 text-center mt-5">
            <h4>No food items available.</h4>
          </div>
        )}
      </div>
    </div>
  );
}

export default FoodDisplay;