public with sharing class GuestChatController {

    private static final String BASE_URL = 'https://bikramkuma-250205-795-demo.my.salesforce-scrt.com';
    private static final String ORG_ID = '00DKd00000BfI1X';
    private static final String ESW_DEV_NAME = 'custom_MIAW_embedded';
    private static final String CAP_VERSION = '1';
    private static final String PLATFORM = 'Web';

    // 1️⃣ Generate Access Token
    @AuraEnabled(cacheable=false)
    public static String generateAccessToken() {
        HttpRequest req = new HttpRequest();
        req.setEndpoint(BASE_URL + '/iamessage/api/v2/authorization/unauthenticated/access-token');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');

        Map<String, Object> context = new Map<String, Object>{
            'appName' => 'guestChatApp',
            'clientVersion' => '1.0.0'
        };
        Map<String, Object> body = new Map<String, Object>{
            'orgId' => ORG_ID,
            'esDeveloperName' => ESW_DEV_NAME,
            'capabilitiesVersion' => CAP_VERSION,
            'platform' => PLATFORM,
            //'deviceId' => '',
            'context' => context
        };
        req.setBody(JSON.serialize(body));

        HttpResponse res = new Http().send(req);
        if (res.getStatusCode() == 200) {
            system.debug('token-->'+res.getBody());
            return ((Map<String,Object>)JSON.deserializeUntyped(res.getBody())).get('accessToken').toString();
        }
        throw new AuraHandledException('Token Error: ' + res.getBody());
    }

    // 2️⃣ Create Conversation
    @AuraEnabled
    public static String createConversation(String accessToken, String email, String firstName, String lastName) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint(BASE_URL + '/iamessage/api/v2/conversation');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Authorization', 'Bearer ' + accessToken);

        String convId = UUID.randomUUID().toString();
        Map<String, Object> body = new Map<String, Object>{
            'conversationId' => convId,
            'esDeveloperName' => ESW_DEV_NAME,
            'language'=> 'en_US',
            'routingAttributes' => new Map<String, String>{
                '_email' => email,
                '_firstName' => firstName,
                '_lastName' => lastName
            }
        };
        req.setBody(JSON.serialize(body));

        HttpResponse res = new Http().send(req);
        if (res.getStatusCode() == 201)
        {
            System.debug('convId'+convId);
        }
        else
        {
            convId = 'Error-->'+res.getBody();
        }
            return convId;
        //throw new AuraHandledException('Create Conversation Error: ' + res.getBody());
    }

    // 3️⃣ Send Message
    @AuraEnabled
    public static void sendMessageToServer(String accessToken, String conversationId, String messageText) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint(BASE_URL + '/iamessage/api/v2/conversation/' + conversationId + '/message');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('x-conversation-id', conversationId);
        req.setHeader('Authorization', 'Bearer ' + accessToken);

        Map<String, Object> messagePayload = new Map<String, Object>{
            'id' => UUID.randomUUID().toString(),
            'messageType' => 'StaticContentMessage',
            'staticContent' => new Map<String, Object>{
                'formatType' => 'Text',
                'text' => messageText
            }
        };
            Map<String, Object> body = new Map<String, Object>{
            'message' => messagePayload,
            'esDeveloperName' => 'custom_MIAW_embedded',
            'isNewMessagingSession' => false,
            'routingAttributes' => new Map<String, Object>{
                'FName' => 'jacob',
                'LName' => 'jacobs',
                'CustomerEmail' => 'jjacobs@acme.com'
            },
            'language' => ''
        };
            System.debug('body'+body);
        req.setBody(JSON.serialize(body));

        HttpResponse res = new Http().send(req);
        if (res.getStatusCode() != 202) {
            throw new AuraHandledException('Send Message Error: ' + res.getBody());
        }
    }

    // 4️⃣ Poll for SSE Events
    @AuraEnabled(cacheable=false)
    public static String pollMessages(String accessToken, String conversationId) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint(BASE_URL + '/iamessage/api/v2/conversations/' + conversationId + '/events');
        req.setMethod('GET');
        req.setHeader('Authorization', 'Bearer ' + accessToken);
        req.setHeader('Accept', 'text/event-stream');

        HttpResponse res = new Http().send(req);
        //if (res.getStatusCode() == 200) return res.getBody();
        //if (res.getStatusCode() == 204) return ''; 
        //throw new AuraHandledException('Poll Error: ' + res.getBody());
        return res.getBody();
    }

    // 5️⃣ End Conversation
    @AuraEnabled
    public static void endConversation(String accessToken, String conversationId) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint(BASE_URL + '/iamessage/api/v2/conversations/' + conversationId + '/end');
        req.setMethod('POST');
        req.setHeader('Authorization', 'Bearer ' + accessToken);

        HttpResponse res = new Http().send(req);
        if (res.getStatusCode() != 200 || res.getStatusCode() != 204) {
            throw new AuraHandledException('End Conversation Error: ' + res.getBody());
        }
    }
}