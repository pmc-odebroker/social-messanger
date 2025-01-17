import React, { useContext, useLayoutEffect, useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { UserType } from '../UserContext';
import { verifyToken, decodeJWT } from '../constants/config';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { userId, setUserId } = useContext(UserType);
  const [users, setUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "",
      headerLeft: () => (
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>Messenger Chat</Text>
      ),
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons onPress={() => navigation.navigate("Chats")} name="chatbox-ellipses-outline" size={24} color="black" />
          <MaterialIcons onPress={() => navigation.navigate("Friends")} name="people-outline" size={24} color="black" />
        </View>
      )
    });
  }, [navigation]);

  useEffect(() => {
    const checkTokenAndFetchUsers = async () => {
        const token = await AsyncStorage.getItem("authToken");
        console.log("Retrieved Token:", token);

        const { isValid } = verifyToken(token);
        if (!isValid) {
            await AsyncStorage.removeItem("authToken");
            navigation.replace("Login");
            return;
        }

        const decodedToken = decodeJWT(token);
        console.log("Decoded token:", decodedToken);

        const userId = decodedToken.userId;
        setUserId(userId);

        axios
            .get(`http://192.168.1.3:8000/users/${userId}`)
            .then((response) => {
                setUsers(response.data);
                console.log(response.data)
            })
            .catch((error) => {
                console.log("Error retrieving users", error);
            });

        const storedFriends = await AsyncStorage.getItem('friends');
        if (storedFriends) {
            setFriends(JSON.parse(storedFriends));
        }

        const storedPendingRequests = await AsyncStorage.getItem('pendingRequests');
        if (storedPendingRequests) {
            setPendingRequests(JSON.parse(storedPendingRequests));
        }
    };

    checkTokenAndFetchUsers();
}, [navigation, setUserId]);


  const handleSendRequest = async (selectedUserId) => {
    try {
        const token = await AsyncStorage.getItem("authToken");
        const decodedToken = decodeJWT(token);
        const currentUserId = decodedToken.userId;

        const response = await axios.post("http://192.168.1.3:8000/friend-request", {
            currentUserId,
            selectedUserId,
        });

        if (response.status === 201) {
            console.log(`Friend request sent to user: ${selectedUserId}`);
            setPendingRequests((prevRequests) => {
                const updatedRequests = [
                    ...prevRequests,
                    { senderId: { _id: selectedUserId }, requestStatus: 'pending' },
                ];
                AsyncStorage.setItem('pendingRequests', JSON.stringify(updatedRequests));
                return updatedRequests;
            });
        } else if (response.status === 200) {
            console.log(response.data.message);
            if (response.data.requestStatus === 'pending') {
                setPendingRequests((prevRequests) => {
                    const updatedRequests = [
                        ...prevRequests,
                        { senderId: { _id: selectedUserId }, requestStatus: 'pending' },
                    ];
                    AsyncStorage.setItem('pendingRequests', JSON.stringify(updatedRequests));
                    return updatedRequests;
                });
            } else if (response.data.requestStatus === 'accepted') {
                setFriends((prevFriends) => {
                    const updatedFriends = [
                        ...prevFriends,
                        { _id: selectedUserId },
                    ];
                    AsyncStorage.setItem('friends', JSON.stringify(updatedFriends));
                    return updatedFriends;
                });
            }
        } else {
            console.error("Failed to send friend request");
        }
    } catch (error) {
        console.error("Error while sending friend request:", error);
    }
};


  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Welcome to Swift Chat</Text>
      </View>

      <View style={styles.userListContainer}>
        {users.length > 0 ? (
          users.map((user, index) => {
            const isFriend = friends.some((friend) => friend._id === user._id);
            const isPending = pendingRequests.some((request) => request.senderId._id === user._id);
          
            return (
              <View key={index} style={styles.userItem}>
                <View style={styles.userInfoContainer}>
                  <View style={styles.userImageContainer}>
                    <Image source={{ uri: user.image }} style={styles.userImage} />
                    {!isFriend && !isPending && (
                      <TouchableOpacity
                        onPress={() => handleSendRequest(user._id)}
                        style={styles.plusButton}
                      >
                        <AntDesign name="pluscircle" size={24} color="white" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.userTextContainer}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text>{user.email}</Text>
                    <View style={styles.statusContainer}>
                      {isPending && <Text style={styles.statusText}>Requesting...</Text>}
                    </View>
                  </View>
                  
                </View>
              </View>
            );
          })
        ) : (
          <Text>No users found</Text>
        )}
      </View>
    </ScrollView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  header: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  userListContainer: {
    paddingBottom: 20,
  },
  userItem: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userImageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  userImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  plusButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'red',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  userTextContainer: {
    marginLeft: 16,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusText: {
    backgroundColor: '#e0e0e0',
    color: '#757575',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    textAlign: 'center',
  },
});
