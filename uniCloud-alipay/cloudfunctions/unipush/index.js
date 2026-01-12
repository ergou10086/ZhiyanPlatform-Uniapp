// 简单的使用示例  
'use strict';  
const uniPush = uniCloud.getPushManager({  
appId: "__UNI__43C3508"  
})  
exports.main = async (event) => {  
    let obj = JSON.parse(event.body)  
        const res = await uniPush.sendMessage({  
        "push_clientid": obj.cids, // 设备id，支持多个以数组的形式指定多个设备，如["cid-1","cid-2"]，数组长度不大于1000  
        "title": obj.title, // 标题  
        "content": obj.content, // 内容  
        "settings": obj.settings, // 消息有效期  
        "payload": obj.payload, // 数据  
        "category": obj.category, // HarmonyOS NEXT系统（纯血鸿蒙、非安卓鸿蒙）的消息分类，要给鸿蒙设备推送时才必传  
        "force_notification": true, //填写true，客户端就会对在线消息自动创建“通知栏消息”，不填写则需要客户端自己处理。  
        "request_id": obj.request_id ,//请求唯一标识号，10-32位之间；如果request_id重复，会导致消息丢失  
        "options":obj.options //消息分类，没申请可以不传这个参数  
    })  
    return res;  
};