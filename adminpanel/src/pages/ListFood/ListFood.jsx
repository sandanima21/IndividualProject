import axios from 'axios';
import React, { useState, useEffect } from 'react';
import {toast} from 'react-toastify';
import './ListFood.css';
import { getFoodList, deleteFood } from '../../services/foodService';

const ListFood = () => {
  const [list, setList] = useState([]);
  const fetchList = async() =>{
    try {
      const data = await getFoodList();
      setList(data);
    } catch (error) {
      toast.error('Error while fetching food list');
    }
  }

  const removeFood = async(foodId) => {
    try {
      const success = await deleteFood(foodId);
      if(success){
        toast.success('Food deleted successfully');
        await fetchList();
      }else{
        toast.error('Error while deleting food');
      }
      
    } catch (error) {
      toast.error('Error while deleting food');
    }
  }

  useEffect(() => {
    fetchList();
  }, []);
  return (
    <div className="py-5 row justify-contrent-center">
      <div className="col-11 card">
        <table className='table'>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {
              list.map((item, index) => {
                return (
                  <tr key={index}>
                    <td>
                      <img src={item.imageUrl} alt={item.name} width={80} height={60}/>
                    </td>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>Rs. {item.price}/=</td>
                    <td className='text-danger'>
                      <i className='bi bi-x-circle-fill' onClick={() => removeFood(item.id)}></i>
                    </td>
                  </tr>
                )
              })
            }
          </tbody>

        </table>
      </div>
    </div>
  )
}

export default ListFood;